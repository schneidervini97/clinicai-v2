// ========================================================================
// APPOINTMENT SERVICE - MAIN CRUD OPERATIONS
// ========================================================================

import { SupabaseClient } from '@supabase/supabase-js'
import {
  Appointment,
  AppointmentSearchResult,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  AppointmentFilters,
  PaginationParams,
  AppointmentHistory
} from '../types/appointment.types'

export class AppointmentService {

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  private static async getCurrentClinicId(supabase: SupabaseClient): Promise<string> {
    const client = supabase
    const { data: { user } } = await client.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: clinic, error } = await client
      .from('clinics')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (error) throw new Error(`Failed to get clinic: ${error.message}`)
    return clinic.id
  }

  private static formatAppointmentTime(appointment: unknown): Appointment {
    return {
      ...appointment,
      start_time: appointment.start_time?.slice(0, 5), // Remove seconds from HH:MM:SS
      end_time: appointment.end_time?.slice(0, 5),
    }
  }

  // ========================================================================
  // CRUD OPERATIONS
  // ========================================================================

  static async create(
    data: CreateAppointmentInput, 
    supabase: SupabaseClient
  ): Promise<Appointment> {
    const client = supabase
    const clinic_id = await this.getCurrentClinicId(client)

    // Calculate end time based on professional's default duration
    const { data: schedule, error: scheduleError } = await client
      .from('professional_schedules')
      .select('appointment_duration')
      .eq('professional_id', data.professional_id)
      .eq('weekday', new Date(data.date).getDay())
      .single()

    if (scheduleError) {
      console.warn('No schedule found for professional, using default 30 minutes')
    }

    const duration = schedule?.appointment_duration || 30
    const startTime = new Date(`1970-01-01T${data.start_time}:00`)
    const endTime = new Date(startTime.getTime() + duration * 60000)
    const end_time = endTime.toTimeString().slice(0, 5)

    const appointmentData = {
      ...data,
      clinic_id,
      date: data.date.toISOString().split('T')[0],
      end_time,
      status: 'scheduled' as const,
    }

    // Check for conflicts
    const { data: conflicts } = await client
      .from('appointments')
      .select('id')
      .eq('professional_id', data.professional_id)
      .eq('date', appointmentData.date)
      .eq('start_time', data.start_time)
      .neq('status', 'cancelled')

    if (conflicts && conflicts.length > 0) {
      throw new Error('Já existe um agendamento para este horário')
    }

    const { data: appointment, error } = await client
      .from('appointments')
      .insert(appointmentData)
      .select(`
        *,
        patient:patients(id, name, phone, email),
        professional:professionals(id, name, specialty)
      `)
      .single()

    if (error) {
      console.error('Error creating appointment:', error)
      throw new Error(error.message)
    }

    return this.formatAppointmentTime(appointment)
  }

  static async findById(
    id: string, 
    supabase: SupabaseClient
  ): Promise<Appointment | null> {
    const client = supabase
    const clinic_id = await this.getCurrentClinicId(client)

    const { data, error } = await client
      .from('appointments')
      .select(`
        *,
        patient:patients(id, name, phone, email),
        professional:professionals(id, name, specialty)
      `)
      .eq('id', id)
      .eq('clinic_id', clinic_id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(error.message)
    }

    return this.formatAppointmentTime(data)
  }

  static async update(
    id: string,
    updates: UpdateAppointmentInput,
    supabase: SupabaseClient
  ): Promise<Appointment> {
    const client = supabase
    const clinic_id = await this.getCurrentClinicId(client)

    // If updating date or time, check for conflicts
    if (updates.date || updates.start_time) {
      const current = await this.findById(id, client)
      if (!current) throw new Error('Agendamento não encontrado')

      const newDate = updates.date ? updates.date.toISOString().split('T')[0] : current.date
      const newStartTime = updates.start_time || current.start_time
      const professionalId = updates.professional_id || current.professional_id

      const { data: conflicts } = await client
        .from('appointments')
        .select('id')
        .eq('professional_id', professionalId)
        .eq('date', newDate)
        .eq('start_time', newStartTime)
        .neq('id', id)
        .neq('status', 'cancelled')

      if (conflicts && conflicts.length > 0) {
        throw new Error('Já existe um agendamento para este horário')
      }

      // Recalculate end time if start time changed
      if (updates.start_time) {
        const { data: schedule } = await client
          .from('professional_schedules')
          .select('appointment_duration')
          .eq('professional_id', professionalId)
          .eq('weekday', new Date(newDate).getDay())
          .single()

        const duration = schedule?.appointment_duration || 30
        const startTime = new Date(`1970-01-01T${updates.start_time}:00`)
        const endTime = new Date(startTime.getTime() + duration * 60000)
        updates.end_time = endTime.toTimeString().slice(0, 5)
      }
    }

    const updateData = {
      ...updates,
      date: updates.date?.toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await client
      .from('appointments')
      .update(updateData)
      .eq('id', id)
      .eq('clinic_id', clinic_id)
      .select(`
        *,
        patient:patients(id, name, phone, email),
        professional:professionals(id, name, specialty)
      `)
      .single()

    if (error) {
      console.error('Error updating appointment:', error)
      throw new Error(error.message)
    }

    return this.formatAppointmentTime(data)
  }

  static async delete(id: string, supabase?: SupabaseClient): Promise<void> {
    const client = supabase
    const clinic_id = await this.getCurrentClinicId(client)

    const { error } = await client
      .from('appointments')
      .delete()
      .eq('id', id)
      .eq('clinic_id', clinic_id)

    if (error) {
      throw new Error(error.message)
    }
  }

  static async cancel(
    id: string, 
    reason: string, 
    supabase: SupabaseClient
  ): Promise<Appointment> {
    const client = supabase
    
    const appointment = await this.update(id, {
      status: 'cancelled',
      internal_notes: reason
    }, client)

    return appointment
  }

  static async confirm(
    id: string, 
    notes?: string, 
    supabase: SupabaseClient
  ): Promise<Appointment> {
    const client = supabase
    
    const appointment = await this.update(id, {
      status: 'confirmed',
      notes: notes || undefined
    }, client)

    return appointment
  }

  static async complete(
    id: string, 
    internalNotes?: string, 
    supabase: SupabaseClient
  ): Promise<Appointment> {
    const client = supabase
    
    const appointment = await this.update(id, {
      status: 'completed',
      internal_notes: internalNotes || undefined
    }, client)

    return appointment
  }

  // ========================================================================
  // SEARCH AND FILTERING
  // ========================================================================

  static async search(
    filters: AppointmentFilters = {},
    pagination: PaginationParams = {},
    supabase: SupabaseClient
  ): Promise<AppointmentSearchResult> {
    const client = supabase
    const clinic_id = await this.getCurrentClinicId(client)
    
    const {
      page = 1,
      per_page = 20,
      sort_by = 'date',
      sort_order = 'asc'
    } = pagination

    let query = client
      .from('appointments')
      .select(`
        *,
        patient:patients(id, name, phone, email),
        professional:professionals(id, name, specialty)
      `, { count: 'exact' })
      .eq('clinic_id', clinic_id)

    // Apply filters
    if (filters.patient_id) {
      query = query.eq('patient_id', filters.patient_id)
    }

    if (filters.professional_id) {
      query = query.eq('professional_id', filters.professional_id)
    }

    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status)
    }

    if (filters.type && filters.type.length > 0) {
      query = query.in('type', filters.type)
    }

    if (filters.date_from) {
      query = query.gte('date', filters.date_from)
    }

    if (filters.date_to) {
      query = query.lte('date', filters.date_to)
    }

    if (filters.search) {
      // Search in patient name or notes
      query = query.or(`patient.name.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`)
    }

    // Apply sorting
    const sortField = sort_by === 'patient' ? 'patient.name' : sort_by
    query = query.order(sortField, { ascending: sort_order === 'asc' })

    // Apply pagination
    const from = (page - 1) * per_page
    const to = from + per_page - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('Error searching appointments:', error)
      throw new Error(error.message)
    }

    const total = count || 0
    const total_pages = Math.ceil(total / per_page)

    return {
      data: data?.map(this.formatAppointmentTime) || [],
      total,
      page,
      per_page,
      total_pages
    }
  }

  // ========================================================================
  // CALENDAR QUERIES
  // ========================================================================

  static async getAppointmentsByDateRange(
    startDate: string,
    endDate: string,
    professionalId?: string,
    supabase: SupabaseClient
  ): Promise<Appointment[]> {
    const client = supabase
    const clinic_id = await this.getCurrentClinicId(client)

    let query = client
      .from('appointments')
      .select(`
        *,
        patient:patients(id, name, phone, email),
        professional:professionals(id, name, specialty)
      `)
      .eq('clinic_id', clinic_id)
      .gte('date', startDate)
      .lte('date', endDate)
      .neq('status', 'cancelled')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })

    if (professionalId) {
      query = query.eq('professional_id', professionalId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error getting appointments by date range:', error)
      throw new Error(error.message)
    }

    return data?.map(this.formatAppointmentTime) || []
  }

  static async getAppointmentsByDate(
    date: string,
    professionalId?: string,
    supabase: SupabaseClient
  ): Promise<Appointment[]> {
    return this.getAppointmentsByDateRange(date, date, professionalId, supabase)
  }

  // ========================================================================
  // HISTORY
  // ========================================================================

  static async getHistory(
    appointmentId: string,
    supabase: SupabaseClient
  ): Promise<AppointmentHistory[]> {
    const client = supabase

    const { data, error } = await client
      .from('appointment_history')
      .select('*')
      .eq('appointment_id', appointmentId)
      .order('changed_at', { ascending: false })

    if (error) {
      console.error('Error getting appointment history:', error)
      throw new Error(error.message)
    }

    return data || []
  }

  // ========================================================================
  // STATISTICS
  // ========================================================================

  static async getDashboardStats(
    startDate: string,
    endDate: string,
    supabase: SupabaseClient
  ) {
    const client = supabase
    const clinic_id = await this.getCurrentClinicId(client)

    const { data, error } = await client
      .from('appointments')
      .select('status, type')
      .eq('clinic_id', clinic_id)
      .gte('date', startDate)
      .lte('date', endDate)

    if (error) {
      console.error('Error getting dashboard stats:', error)
      throw new Error(error.message)
    }

    const appointments = data || []
    const total = appointments.length
    
    const stats = {
      total,
      scheduled: appointments.filter(a => a.status === 'scheduled').length,
      confirmed: appointments.filter(a => a.status === 'confirmed').length,
      completed: appointments.filter(a => a.status === 'completed').length,
      cancelled: appointments.filter(a => a.status === 'cancelled').length,
      no_show: appointments.filter(a => a.status === 'no_show').length,
      by_type: {
        consultation: appointments.filter(a => a.type === 'consultation').length,
        return: appointments.filter(a => a.type === 'return').length,
        exam: appointments.filter(a => a.type === 'exam').length,
        procedure: appointments.filter(a => a.type === 'procedure').length,
      }
    }

    return stats
  }
}