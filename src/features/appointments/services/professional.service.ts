// ========================================================================
// PROFESSIONAL SERVICE - MANAGE HEALTHCARE PROFESSIONALS
// ========================================================================

import { SupabaseClient } from '@supabase/supabase-js'
import {
  Professional,
  ProfessionalSchedule,
  ScheduleException,
  CreateProfessionalInput,
  UpdateProfessionalInput,
  ProfessionalFilters,
  PaginationParams
} from '../types/appointment.types'

export class ProfessionalService {
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

  // ========================================================================
  // PROFESSIONAL CRUD
  // ========================================================================

  static async create(
    data: CreateProfessionalInput,
    supabase: SupabaseClient
  ): Promise<Professional> {
    const client = supabase
    const clinic_id = await this.getCurrentClinicId(client)

    const professionalData = {
      ...data,
      clinic_id,
      email: data.email || null,
      phone: data.phone || null,
      specialty: data.specialty || null,
      registration_number: data.registration_number || null,
    }

    const { data: professional, error } = await client
      .from('professionals')
      .insert(professionalData)
      .select()
      .single()

    if (error) {
      console.error('Error creating professional:', error)
      throw new Error(error.message)
    }

    return professional
  }

  static async findById(
    id: string,
    supabase: SupabaseClient
  ): Promise<Professional | null> {
    const client = supabase
    const clinic_id = await this.getCurrentClinicId(client)

    const { data, error } = await client
      .from('professionals')
      .select('*')
      .eq('id', id)
      .eq('clinic_id', clinic_id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(error.message)
    }

    return data
  }

  static async update(
    id: string,
    updates: UpdateProfessionalInput,
    supabase: SupabaseClient
  ): Promise<Professional> {
    const client = supabase
    const clinic_id = await this.getCurrentClinicId(client)

    const { data, error } = await client
      .from('professionals')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('clinic_id', clinic_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating professional:', error)
      throw new Error(error.message)
    }

    return data
  }

  static async delete(id: string, supabase: SupabaseClient): Promise<void> {
    const client = supabase
    const clinic_id = await this.getCurrentClinicId(client)

    const { error } = await client
      .from('professionals')
      .delete()
      .eq('id', id)
      .eq('clinic_id', clinic_id)

    if (error) {
      throw new Error(error.message)
    }
  }

  static async list(
    filters: ProfessionalFilters = {},
    pagination: PaginationParams = {},
    supabase: SupabaseClient
  ): Promise<Professional[]> {
    const client = supabase
    const clinic_id = await this.getCurrentClinicId(client)

    const {
      page = 1,
      per_page = 50,
      sort_by = 'name',
      sort_order = 'asc'
    } = pagination

    let query = client
      .from('professionals')
      .select('*')
      .eq('clinic_id', clinic_id)

    // Apply filters
    if (filters.specialty) {
      query = query.eq('specialty', filters.specialty)
    }

    if (filters.active !== undefined) {
      query = query.eq('active', filters.active)
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,specialty.ilike.%${filters.search}%,registration_number.ilike.%${filters.search}%`)
    }

    // Apply sorting and pagination
    query = query
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range((page - 1) * per_page, page * per_page - 1)

    const { data, error } = await query

    if (error) {
      console.error('Error listing professionals:', error)
      throw new Error(error.message)
    }

    return data || []
  }

  static async listActive(supabase: SupabaseClient): Promise<Professional[]> {
    return this.list({ active: true }, { per_page: 100 }, supabase)
  }

  // ========================================================================
  // SCHEDULE MANAGEMENT
  // ========================================================================

  static async createSchedule(
    data: Omit<ProfessionalSchedule, 'id' | 'created_at' | 'updated_at'>,
    supabase: SupabaseClient
  ): Promise<ProfessionalSchedule> {
    const client = supabase

    const scheduleData = {
      ...data,
      lunch_start: data.lunch_start || null,
      lunch_end: data.lunch_end || null,
    }

    const { data: schedule, error } = await client
      .from('professional_schedules')
      .insert(scheduleData)
      .select()
      .single()

    if (error) {
      console.error('Error creating professional schedule:', error)
      throw new Error(error.message)
    }

    return schedule
  }

  static async getSchedules(
    professionalId: string,
    supabase: SupabaseClient
  ): Promise<ProfessionalSchedule[]> {
    const client = supabase

    const { data, error } = await client
      .from('professional_schedules')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('active', true)
      .order('weekday', { ascending: true })

    if (error) {
      console.error('Error getting professional schedules:', error)
      throw new Error(error.message)
    }

    return data || []
  }

  static async updateSchedule(
    id: string,
    updates: Partial<Omit<ProfessionalSchedule, 'id' | 'professional_id' | 'created_at' | 'updated_at'>>,
    supabase: SupabaseClient
  ): Promise<ProfessionalSchedule> {
    const client = supabase

    const { data, error } = await client
      .from('professional_schedules')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating professional schedule:', error)
      throw new Error(error.message)
    }

    return data
  }

  static async deleteSchedule(id: string, supabase: SupabaseClient): Promise<void> {
    const client = supabase

    const { error } = await client
      .from('professional_schedules')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  }

  // ========================================================================
  // SCHEDULE EXCEPTIONS
  // ========================================================================

  static async createException(
    data: Omit<ScheduleException, 'id' | 'created_at' | 'updated_at'>,
    supabase: SupabaseClient
  ): Promise<ScheduleException> {
    const client = supabase

    const exceptionData = {
      ...data,
      date: typeof data.date === 'string' ? data.date : data.date.toISOString().split('T')[0],
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      description: data.description || null,
    }

    const { data: exception, error } = await client
      .from('schedule_exceptions')
      .insert(exceptionData)
      .select()
      .single()

    if (error) {
      console.error('Error creating schedule exception:', error)
      throw new Error(error.message)
    }

    return exception
  }

  static async getExceptions(
    professionalId: string,
    startDate?: string,
    endDate?: string,
    supabase: SupabaseClient
  ): Promise<ScheduleException[]> {
    const client = supabase

    let query = client
      .from('schedule_exceptions')
      .select('*')
      .eq('professional_id', professionalId)

    if (startDate) {
      query = query.gte('date', startDate)
    }

    if (endDate) {
      query = query.lte('date', endDate)
    }

    query = query.order('date', { ascending: true })

    const { data, error } = await query

    if (error) {
      console.error('Error getting schedule exceptions:', error)
      throw new Error(error.message)
    }

    return data || []
  }

  static async deleteException(id: string, supabase: SupabaseClient): Promise<void> {
    const client = supabase

    const { error } = await client
      .from('schedule_exceptions')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  static async getWorkingHours(
    professionalId: string,
    date: Date,
    supabase: SupabaseClient
  ): Promise<{ start: string; end: string; duration: number } | null> {
    const client = supabase
    const weekday = date.getDay()
    const dateStr = date.toISOString().split('T')[0]

    // Check for exceptions first
    const { data: exception, error: exceptionError } = await client
      .from('schedule_exceptions')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('date', dateStr)
      .single()
    
    if (exceptionError) {
      // Check if it's a 406 error related to RLS
      if (exceptionError.code === '42501' || exceptionError.message?.includes('insufficient privilege')) {
        console.warn('⚠️ RLS Error on schedule_exceptions:', {
          message: 'Row Level Security is blocking access to schedule_exceptions table',
          hint: 'Check RLS policies or disable RLS temporarily',
          professionalId,
          date: dateStr
        })
      } else if (exceptionError.code === 'PGRST116') {
        // This is normal - no schedule exception found for this date
        // Don't log anything as this is expected behavior
      } else {
        console.error('Error fetching schedule exceptions:', {
          error: JSON.stringify(exceptionError),
          code: exceptionError.code,
          message: exceptionError.message,
          details: exceptionError.details,
          hint: exceptionError.hint,
          professionalId,
          date: dateStr
        })
      }
      // Continue execution - exceptions are optional
    }

    if (exception) {
      if (exception.all_day) {
        return null // Professional is not available this day
      }
      // Return exception times
      return {
        start: exception.start_time!,
        end: exception.end_time!,
        duration: 30 // Default duration
      }
    }

    // Get regular schedule
    const { data: schedule, error: scheduleError } = await client
      .from('professional_schedules')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('weekday', weekday)
      .eq('active', true)
      .single()

    if (scheduleError) {
      // Check if it's a 406/RLS error
      if (scheduleError.code === '42501' || scheduleError.message?.includes('insufficient privilege')) {
        console.warn('🚨 RLS Error on professional_schedules:', {
          message: 'Row Level Security is blocking access to professional_schedules table',
          hint: 'Execute: ALTER TABLE professional_schedules DISABLE ROW LEVEL SECURITY; in Supabase SQL Editor',
          professionalId,
          weekday,
          date: dateStr
        })
      } else if (scheduleError.code === 'PGRST116') {
        // This is normal - no schedule found for this weekday
        // Don't log anything as this is expected behavior
      } else {
        console.error('Error fetching professional schedule:', {
          error: JSON.stringify(scheduleError),
          code: scheduleError.code,
          message: scheduleError.message,
          details: scheduleError.details,
          hint: scheduleError.hint,
          professionalId,
          weekday,
          date: dateStr
        })
      }
      return null // No schedule available
    }

    if (!schedule) {
      console.warn('No schedule found for professional:', { professionalId, weekday, date: dateStr })
      return null
    }

    return {
      start: schedule.start_time,
      end: schedule.end_time,
      duration: schedule.appointment_duration
    }
  }

  static async isAvailable(
    professionalId: string,
    date: Date,
    startTime: string,
    supabase: SupabaseClient
  ): Promise<boolean> {
    const client = supabase
    const dateStr = date.toISOString().split('T')[0]

    // Check working hours
    const workingHours = await this.getWorkingHours(professionalId, date, client)
    if (!workingHours) {
      return false
    }

    // Check if time is within working hours
    if (startTime < workingHours.start || startTime >= workingHours.end) {
      return false
    }

    // Check for existing appointments
    const { data: appointments } = await client
      .from('appointments')
      .select('id')
      .eq('professional_id', professionalId)
      .eq('date', dateStr)
      .eq('start_time', startTime)
      .neq('status', 'cancelled')

    return !appointments || appointments.length === 0
  }
}