// ========================================================================
// CONSULTATION TYPE SERVICE - MANAGE CONSULTATION TYPES
// ========================================================================

import { SupabaseClient } from '@supabase/supabase-js'
import {
  ConsultationType,
  ProfessionalConsultationType,
  ConsultationTypeWithCustomizations,
  CreateConsultationTypeInput,
  UpdateConsultationTypeInput,
  ProfessionalConsultationTypeInput,
  UpdateProfessionalConsultationTypeInput,
  ConsultationTypeFilters,
  PaginationParams
} from '../types/consultation-types'

export class ConsultationTypeService {
  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  private static async getCurrentClinicId(supabase: SupabaseClient): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: clinic, error } = await supabase
      .from('clinics')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (error) throw new Error(`Failed to get clinic: ${error.message}`)
    return clinic.id
  }

  // ========================================================================
  // CONSULTATION TYPE CRUD
  // ========================================================================

  static async create(
    data: CreateConsultationTypeInput,
    supabase: SupabaseClient
  ): Promise<ConsultationType> {
    const clinic_id = await this.getCurrentClinicId(supabase)

    // If this is set as default, unset other defaults first
    if (data.is_default) {
      await supabase
        .from('consultation_types')
        .update({ is_default: false })
        .eq('clinic_id', clinic_id)
        .eq('is_default', true)
    }

    const consultationTypeData = {
      ...data,
      clinic_id,
      description: data.description || null,
      price: data.price || null,
      preparation_instructions: data.preparation_instructions || null,
    }

    const { data: consultationType, error } = await supabase
      .from('consultation_types')
      .insert(consultationTypeData)
      .select()
      .single()

    if (error) {
      console.error('Error creating consultation type:', error)
      throw new Error(error.message)
    }

    return consultationType
  }

  static async findById(
    id: string,
    supabase: SupabaseClient
  ): Promise<ConsultationType | null> {
    const clinic_id = await this.getCurrentClinicId(supabase)

    const { data, error } = await supabase
      .from('consultation_types')
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
    updates: UpdateConsultationTypeInput,
    supabase: SupabaseClient
  ): Promise<ConsultationType> {
    const clinic_id = await this.getCurrentClinicId(supabase)

    // If this is set as default, unset other defaults first
    if (updates.is_default) {
      await supabase
        .from('consultation_types')
        .update({ is_default: false })
        .eq('clinic_id', clinic_id)
        .eq('is_default', true)
        .neq('id', id)
    }

    const { data, error } = await supabase
      .from('consultation_types')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('clinic_id', clinic_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating consultation type:', error)
      throw new Error(error.message)
    }

    return data
  }

  static async delete(id: string, supabase: SupabaseClient): Promise<void> {
    const clinic_id = await this.getCurrentClinicId(supabase)

    // Check if there are appointments using this consultation type
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id')
      .eq('consultation_type_id', id)
      .limit(1)

    if (appointments && appointments.length > 0) {
      throw new Error('Não é possível excluir um tipo de consulta que possui agendamentos vinculados')
    }

    const { error } = await supabase
      .from('consultation_types')
      .delete()
      .eq('id', id)
      .eq('clinic_id', clinic_id)

    if (error) {
      throw new Error(error.message)
    }
  }

  static async list(
    filters: ConsultationTypeFilters = {},
    pagination: PaginationParams = {},
    supabase: SupabaseClient
  ): Promise<ConsultationType[]> {
    const clinic_id = await this.getCurrentClinicId(supabase)

    const {
      page = 1,
      per_page = 50,
      sort_by = 'name',
      sort_order = 'asc'
    } = pagination

    let query = supabase
      .from('consultation_types')
      .select('*')
      .eq('clinic_id', clinic_id)

    // Apply filters
    if (filters.active !== undefined) {
      query = query.eq('active', filters.active)
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    // Apply sorting and pagination
    query = query
      .order('is_default', { ascending: false }) // Default types first
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range((page - 1) * per_page, page * per_page - 1)

    const { data, error } = await query

    if (error) {
      console.error('Error listing consultation types:', error)
      throw new Error(error.message)
    }

    return data || []
  }

  static async listActive(supabase: SupabaseClient): Promise<ConsultationType[]> {
    return this.list({ active: true }, { per_page: 100 }, supabase)
  }

  // ========================================================================
  // PROFESSIONAL CONSULTATION TYPE MANAGEMENT
  // ========================================================================

  static async addToProfessional(
    data: ProfessionalConsultationTypeInput,
    supabase: SupabaseClient
  ): Promise<ProfessionalConsultationType> {
    const professionalConsultationTypeData = {
      ...data,
      custom_duration: data.custom_duration || null,
      custom_price: data.custom_price || null,
    }

    const { data: professionalConsultationType, error } = await supabase
      .from('professional_consultation_types')
      .insert(professionalConsultationTypeData)
      .select()
      .single()

    if (error) {
      console.error('Error adding consultation type to professional:', error)
      throw new Error(error.message)
    }

    return professionalConsultationType
  }

  static async removeFromProfessional(
    professionalId: string,
    consultationTypeId: string,
    supabase: SupabaseClient
  ): Promise<void> {
    const { error } = await supabase
      .from('professional_consultation_types')
      .delete()
      .eq('professional_id', professionalId)
      .eq('consultation_type_id', consultationTypeId)

    if (error) {
      throw new Error(error.message)
    }
  }

  static async updateProfessionalConsultationType(
    professionalId: string,
    consultationTypeId: string,
    updates: UpdateProfessionalConsultationTypeInput,
    supabase: SupabaseClient
  ): Promise<ProfessionalConsultationType> {
    const { data, error } = await supabase
      .from('professional_consultation_types')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('professional_id', professionalId)
      .eq('consultation_type_id', consultationTypeId)
      .select()
      .single()

    if (error) {
      console.error('Error updating professional consultation type:', error)
      throw new Error(error.message)
    }

    return data
  }

  static async getByProfessional(
    professionalId: string,
    supabase: SupabaseClient
  ): Promise<ConsultationTypeWithCustomizations[]> {
    const clinic_id = await this.getCurrentClinicId(supabase)

    const { data, error } = await supabase
      .from('consultation_types')
      .select(`
        *,
        professional_consultation_types!left (
          custom_duration,
          custom_price,
          available
        )
      `)
      .eq('clinic_id', clinic_id)
      .eq('active', true)
      .eq('professional_consultation_types.professional_id', professionalId)
      .eq('professional_consultation_types.available', true)
      .order('is_default', { ascending: false })
      .order('name')

    if (error) {
      console.error('Error getting consultation types for professional:', error)
      throw new Error(error.message)
    }

    return (data || []).map(item => ({
      ...item,
      custom_duration: item.professional_consultation_types?.[0]?.custom_duration,
      custom_price: item.professional_consultation_types?.[0]?.custom_price,
      final_duration: item.professional_consultation_types?.[0]?.custom_duration || item.duration,
      final_price: item.professional_consultation_types?.[0]?.custom_price || item.price,
    }))
  }

  static async getAllWithProfessionalStatus(
    professionalId: string,
    supabase: SupabaseClient
  ): Promise<(ConsultationType & { is_assigned: boolean; custom_duration?: number; custom_price?: number })[]> {
    const clinic_id = await this.getCurrentClinicId(supabase)

    const { data, error } = await supabase
      .from('consultation_types')
      .select(`
        *,
        professional_consultation_types!left (
          custom_duration,
          custom_price,
          available
        )
      `)
      .eq('clinic_id', clinic_id)
      .eq('active', true)
      .order('is_default', { ascending: false })
      .order('name')

    if (error) {
      console.error('Error getting all consultation types with professional status:', error)
      throw new Error(error.message)
    }

    return (data || []).map(item => {
      const professionalLink = item.professional_consultation_types?.find(
        (pct: any) => pct && pct.available
      )

      return {
        ...item,
        is_assigned: !!professionalLink,
        custom_duration: professionalLink?.custom_duration,
        custom_price: professionalLink?.custom_price,
      }
    })
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  static async getDefault(supabase: SupabaseClient): Promise<ConsultationType | null> {
    const clinic_id = await this.getCurrentClinicId(supabase)

    const { data, error } = await supabase
      .from('consultation_types')
      .select('*')
      .eq('clinic_id', clinic_id)
      .eq('is_default', true)
      .eq('active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Error getting default consultation type:', error)
      return null
    }

    return data
  }

  static async setAsDefault(id: string, supabase: SupabaseClient): Promise<void> {
    const clinic_id = await this.getCurrentClinicId(supabase)

    // Remove default from all other types
    await supabase
      .from('consultation_types')
      .update({ is_default: false })
      .eq('clinic_id', clinic_id)

    // Set this type as default
    const { error } = await supabase
      .from('consultation_types')
      .update({ is_default: true })
      .eq('id', id)
      .eq('clinic_id', clinic_id)

    if (error) {
      throw new Error(error.message)
    }
  }

  static async getStatistics(supabase: SupabaseClient) {
    const clinic_id = await this.getCurrentClinicId(supabase)

    const { data: types, error: typesError } = await supabase
      .from('consultation_types')
      .select('id, name, color')
      .eq('clinic_id', clinic_id)
      .eq('active', true)

    if (typesError) {
      throw new Error(typesError.message)
    }

    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('consultation_type_id')
      .eq('clinic_id', clinic_id)
      .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

    if (appointmentsError) {
      throw new Error(appointmentsError.message)
    }

    const stats = types?.map(type => ({
      ...type,
      appointment_count: appointments?.filter(apt => apt.consultation_type_id === type.id).length || 0
    })) || []

    return stats
  }
}