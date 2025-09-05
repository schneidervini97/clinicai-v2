// ========================================================================
// CLINIC SERVICE - MANAGE CLINIC DATA
// ========================================================================

import { SupabaseClient } from '@supabase/supabase-js'

export interface ClinicData {
  id: string
  user_id: string
  name: string
  phone: string
  specialties: string[]
  cep: string
  address: string
  number: string
  complement?: string
  city: string
  state: string
  created_at: string
  updated_at: string
}

export interface UpdateClinicData {
  name?: string
  phone?: string
  specialties?: string[]
  cep?: string
  address?: string
  number?: string
  complement?: string
  city?: string
  state?: string
}

export class ClinicService {
  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  private static async getCurrentUserId(supabase: SupabaseClient): Promise<string> {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) throw new Error('User not authenticated')
    return user.id
  }

  // ========================================================================
  // CRUD OPERATIONS
  // ========================================================================

  /**
   * Get clinic data for the current user
   */
  static async getByUserId(supabase: SupabaseClient): Promise<ClinicData | null> {
    const userId = await this.getCurrentUserId(supabase)

    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No clinic found for user
        return null
      }
      console.error('Error getting clinic data:', error)
      throw new Error(error.message)
    }

    return data
  }

  /**
   * Update clinic data for the current user
   */
  static async update(
    updates: UpdateClinicData,
    supabase: SupabaseClient
  ): Promise<ClinicData> {
    const userId = await this.getCurrentUserId(supabase)

    const { data, error } = await supabase
      .from('clinics')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating clinic data:', error)
      throw new Error(error.message)
    }

    return data
  }

  /**
   * Create clinic data (used during onboarding)
   */
  static async create(
    clinicData: Omit<UpdateClinicData, 'user_id'> & Required<Pick<UpdateClinicData, 'name' | 'phone' | 'specialties' | 'cep' | 'address' | 'number' | 'city' | 'state'>>,
    supabase: SupabaseClient
  ): Promise<ClinicData> {
    const userId = await this.getCurrentUserId(supabase)

    const { data, error } = await supabase
      .from('clinics')
      .insert({
        user_id: userId,
        ...clinicData,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating clinic data:', error)
      throw new Error(error.message)
    }

    return data
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Check if clinic exists for current user
   */
  static async exists(supabase: SupabaseClient): Promise<boolean> {
    try {
      const clinic = await this.getByUserId(supabase)
      return clinic !== null
    } catch (error) {
      return false
    }
  }

  /**
   * Format clinic address as single string
   */
  static formatAddress(clinic: ClinicData): string {
    const parts = [
      clinic.address,
      clinic.number,
      clinic.complement,
      clinic.city,
      clinic.state,
      clinic.cep
    ].filter(Boolean)

    return parts.join(', ')
  }

  /**
   * Get clinic display name (fallback to user email if no name)
   */
  static getDisplayName(clinic: ClinicData | null): string {
    return clinic?.name || 'Clínica'
  }
}