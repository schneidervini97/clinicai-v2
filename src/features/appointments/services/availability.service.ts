// ========================================================================
// AVAILABILITY SERVICE - CALCULATE AVAILABLE TIME SLOTS
// ========================================================================

import { SupabaseClient } from '@supabase/supabase-js'
import { ProfessionalService } from './professional.service'
import { 
  AvailabilitySlot, 
  TimeSlot, 
  Availability, 
  CreateAvailabilityInput, 
  UpdateAvailabilityInput, 
  AvailabilityFilters,
  AvailabilitySearchResult
} from '../types/appointment.types'
import { PaginationParams } from '@/lib/types/common'

export class AvailabilityService {

  // ========================================================================
  // CRUD METHODS FOR AVAILABILITY RECORDS
  // ========================================================================

  /**
   * Create new availability record
   */
  static async create(data: CreateAvailabilityInput, supabase: SupabaseClient): Promise<Availability> {
    const { data: availability, error } = await supabase
      .from('availability')
      .insert([data])
      .select('*')
      .single()

    if (error) {
      console.error('Error creating availability:', error)
      throw new Error(error.message)
    }

    return availability
  }

  /**
   * Update availability record
   */
  static async update(id: string, updates: UpdateAvailabilityInput, supabase: SupabaseClient): Promise<Availability> {
    const { data: availability, error } = await supabase
      .from('availability')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating availability:', error)
      throw new Error(error.message)
    }

    return availability
  }

  /**
   * Delete availability record
   */
  static async delete(id: string, supabase: SupabaseClient): Promise<void> {
    const { error } = await supabase
      .from('availability')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting availability:', error)
      throw new Error(error.message)
    }
  }

  /**
   * Get availability records by professional ID
   */
  static async getByProfessionalId(professionalId: string, supabase: SupabaseClient): Promise<Availability[]> {
    const { data: availability, error } = await supabase
      .from('availability')
      .select('*')
      .eq('professional_id', professionalId)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) {
      console.error('Error getting availability by professional:', error)
      throw new Error(error.message)
    }

    return availability || []
  }

  /**
   * List availability records with filters and pagination
   */
  static async list(
    filters: AvailabilityFilters = {}, 
    pagination: PaginationParams = { page: 1, per_page: 50 },
    supabase: SupabaseClient
  ): Promise<AvailabilitySearchResult> {
    let query = supabase
      .from('availability')
      .select('*', { count: 'exact' })

    // Apply filters
    if (filters.professional_id) {
      query = query.eq('professional_id', filters.professional_id)
    }

    if (filters.day_of_week) {
      query = query.eq('day_of_week', filters.day_of_week)
    }

    if (filters.is_available !== undefined) {
      query = query.eq('is_available', filters.is_available)
    }

    // Apply pagination
    const from = (pagination.page - 1) * pagination.per_page
    const to = from + pagination.per_page - 1

    query = query
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true })
      .range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('Error listing availability:', error)
      throw new Error(error.message)
    }

    const totalPages = Math.ceil((count || 0) / pagination.per_page)

    return {
      data: data || [],
      total: count || 0,
      page: pagination.page,
      per_page: pagination.per_page,
      total_pages: totalPages,
    }
  }

  // ========================================================================
  // MAIN AVAILABILITY METHODS
  // ========================================================================

  /**
   * Get available time slots for a professional on a specific date
   */
  static async getAvailableSlots(
    professionalId: string,
    date: Date,
    duration: number = 30,
    supabase: SupabaseClient
  ): Promise<AvailabilitySlot[]> {
    const client = supabase
    const dateStr = date.toISOString().split('T')[0]

    // Get working hours for this professional on this date
    const workingHours = await ProfessionalService.getWorkingHours(professionalId, date, client)
    if (!workingHours) {
      return [] // Professional doesn't work on this day
    }

    // Get existing appointments for this date
    const { data: appointments, error } = await client
      .from('appointments')
      .select('start_time, end_time')
      .eq('professional_id', professionalId)
      .eq('date', dateStr)
      .neq('status', 'cancelled')

    if (error) {
      console.error('Error getting appointments:', error)
      throw new Error(error.message)
    }

    const bookedSlots = new Set(appointments?.map(apt => apt.start_time) || [])

    // Generate time slots
    const slots: AvailabilitySlot[] = []
    const actualDuration = workingHours.duration || duration

    // Morning slots (start to lunch start, or start to end if no lunch)
    const lunchStart = await this.getLunchStart(professionalId, date.getDay(), client)
    const morningEnd = lunchStart || workingHours.end
    
    let currentTime = this.parseTime(workingHours.start)
    const morningEndTime = this.parseTime(morningEnd)

    while (currentTime < morningEndTime) {
      const timeStr = this.formatTime(currentTime)
      const endTime = currentTime + actualDuration * 60000
      
      // Don't create slots that would go past the morning end
      if (endTime <= morningEndTime) {
        slots.push({
          time: timeStr,
          available: !bookedSlots.has(timeStr),
          professional_id: professionalId,
          duration: actualDuration
        })
      }

      currentTime += actualDuration * 60000
    }

    // Afternoon slots (lunch end to end, if lunch exists)
    const lunchEnd = await this.getLunchEnd(professionalId, date.getDay(), client)
    if (lunchEnd) {
      currentTime = this.parseTime(lunchEnd)
      const endTime = this.parseTime(workingHours.end)

      while (currentTime < endTime) {
        const timeStr = this.formatTime(currentTime)
        const slotEndTime = currentTime + actualDuration * 60000
        
        // Don't create slots that would go past the end time
        if (slotEndTime <= endTime) {
          slots.push({
            time: timeStr,
            available: !bookedSlots.has(timeStr),
            professional_id: professionalId,
            duration: actualDuration
          })
        }

        currentTime += actualDuration * 60000
      }
    }

    return slots
  }

  /**
   * Get available slots for multiple professionals on a date
   */
  static async getAvailableSlotsMultiple(
    professionalIds: string[],
    date: Date,
    duration: number = 30,
    supabase: SupabaseClient
  ): Promise<Record<string, AvailabilitySlot[]>> {
    const results: Record<string, AvailabilitySlot[]> = {}

    for (const professionalId of professionalIds) {
      try {
        results[professionalId] = await this.getAvailableSlots(
          professionalId, 
          date, 
          duration, 
          supabase
        )
      } catch (error) {
        console.error(`Error getting slots for professional ${professionalId}:`, error)
        results[professionalId] = []
      }
    }

    return results
  }

  /**
   * Get next available slot for a professional
   */
  static async getNextAvailableSlot(
    professionalId: string,
    fromDate: Date = new Date(),
    duration: number = 30,
    supabase: SupabaseClient
  ): Promise<{ date: Date; time: string } | null> {
    const maxDays = 30 // Don't search more than 30 days ahead
    const currentDate = new Date(fromDate)
    
    for (let i = 0; i < maxDays; i++) {
      const slots = await this.getAvailableSlots(professionalId, currentDate, duration, supabase)
      const availableSlot = slots.find(slot => slot.available)
      
      if (availableSlot) {
        return {
          date: currentDate,
          time: availableSlot.time
        }
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return null
  }

  // ========================================================================
  // BULK AVAILABILITY METHODS
  // ========================================================================

  /**
   * Get availability overview for a week
   */
  static async getWeeklyAvailability(
    professionalId: string,
    weekStartDate: Date,
    supabase: SupabaseClient
  ): Promise<Record<string, { total: number; available: number }>> {
    const result: Record<string, { total: number; available: number }> = {}
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStartDate)
      date.setDate(weekStartDate.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      
      try {
        const slots = await this.getAvailableSlots(professionalId, date, 30, supabase)
        const availableCount = slots.filter(slot => slot.available).length
        
        result[dateStr] = {
          total: slots.length,
          available: availableCount
        }
      } catch (error) {
        result[dateStr] = { total: 0, available: 0 }
      }
    }

    return result
  }

  /**
   * Check if a specific time slot is available
   */
  static async isSlotAvailable(
    professionalId: string,
    date: Date,
    time: string,
    supabase: SupabaseClient
  ): Promise<boolean> {
    const slots = await this.getAvailableSlots(professionalId, date, 30, supabase)
    const slot = slots.find(s => s.time === time)
    return slot ? slot.available : false
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  private static async getLunchStart(
    professionalId: string,
    weekday: number,
    supabase: SupabaseClient
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from('professional_schedules')
      .select('lunch_start')
      .eq('professional_id', professionalId)
      .eq('weekday', weekday)
      .eq('active', true)
      .single()

    if (error) {
      // Check if it's RLS blocking access
      if (error.code === '42501' || error.message?.includes('insufficient privilege')) {
        console.warn('⚠️ RLS blocking lunch_start access:', {
          message: 'Row Level Security is blocking professional_schedules table',
          hint: 'Fix RLS policies or disable RLS temporarily',
          professionalId,
          weekday
        })
      } else if (error.code === 'PGRST116') {
        // This is normal - no schedule found for this weekday
        // Don't log anything as this is expected behavior
      } else {
        console.error('Error fetching lunch start from professional_schedules:', {
          error: JSON.stringify(error),
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          professionalId,
          weekday
        })
      }
      return null
    }

    return data?.lunch_start || null
  }

  private static async getLunchEnd(
    professionalId: string,
    weekday: number,
    supabase: SupabaseClient
  ): Promise<string | null> {
    const { data, error } = await supabase
      .from('professional_schedules')
      .select('lunch_end')
      .eq('professional_id', professionalId)
      .eq('weekday', weekday)
      .eq('active', true)
      .single()

    if (error) {
      // Check if it's RLS blocking access
      if (error.code === '42501' || error.message?.includes('insufficient privilege')) {
        console.warn('⚠️ RLS blocking lunch_end access:', {
          message: 'Row Level Security is blocking professional_schedules table',
          hint: 'Fix RLS policies or disable RLS temporarily',
          professionalId,
          weekday
        })
      } else if (error.code === 'PGRST116') {
        // This is normal - no schedule found for this weekday
        // Don't log anything as this is expected behavior
      } else {
        console.error('Error fetching lunch end from professional_schedules:', {
          error: JSON.stringify(error),
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          professionalId,
          weekday
        })
      }
      return null
    }

    return data?.lunch_end || null
  }

  /**
   * Parse time string (HH:MM) to timestamp
   */
  private static parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number)
    const date = new Date(1970, 0, 1, hours, minutes)
    return date.getTime()
  }

  /**
   * Format timestamp to time string (HH:MM)
   */
  private static formatTime(timestamp: number): string {
    const date = new Date(timestamp)
    return date.toTimeString().slice(0, 5)
  }

  /**
   * Add minutes to a time string
   */
  static addMinutesToTime(timeStr: string, minutes: number): string {
    const timestamp = this.parseTime(timeStr)
    const newTimestamp = timestamp + (minutes * 60000)
    return this.formatTime(newTimestamp)
  }

  /**
   * Get time slots between two times with specific interval
   */
  static generateTimeSlots(
    startTime: string,
    endTime: string,
    intervalMinutes: number = 30
  ): string[] {
    const slots: string[] = []
    let currentTime = this.parseTime(startTime)
    const endTimeStamp = this.parseTime(endTime)

    while (currentTime < endTimeStamp) {
      slots.push(this.formatTime(currentTime))
      currentTime += intervalMinutes * 60000
    }

    return slots
  }

  /**
   * Check if a time is within business hours (excluding lunch)
   */
  static isTimeInBusinessHours(
    time: string,
    schedule: {
      start_time: string
      end_time: string
      lunch_start?: string
      lunch_end?: string
    }
  ): boolean {
    const timeStamp = this.parseTime(time)
    const startStamp = this.parseTime(schedule.start_time)
    const endStamp = this.parseTime(schedule.end_time)

    // Check if time is within overall working hours
    if (timeStamp < startStamp || timeStamp >= endStamp) {
      return false
    }

    // Check if time is during lunch break
    if (schedule.lunch_start && schedule.lunch_end) {
      const lunchStartStamp = this.parseTime(schedule.lunch_start)
      const lunchEndStamp = this.parseTime(schedule.lunch_end)
      
      if (timeStamp >= lunchStartStamp && timeStamp < lunchEndStamp) {
        return false
      }
    }

    return true
  }

  /**
   * Calculate duration between two times in minutes
   */
  static calculateDuration(startTime: string, endTime: string): number {
    const startStamp = this.parseTime(startTime)
    const endStamp = this.parseTime(endTime)
    return Math.round((endStamp - startStamp) / 60000)
  }

  /**
   * Find optimal time slots based on patient preferences
   */
  static async findOptimalSlots(
    professionalId: string,
    date: Date,
    preferredTimes: string[] = [], // ['09:00', '14:00'] etc
    duration: number = 30,
    supabase: SupabaseClient
  ): Promise<AvailabilitySlot[]> {
    const allSlots = await this.getAvailableSlots(professionalId, date, duration, supabase)
    const availableSlots = allSlots.filter(slot => slot.available)

    if (preferredTimes.length === 0) {
      return availableSlots
    }

    // Sort slots by proximity to preferred times
    const sortedSlots = availableSlots.sort((a, b) => {
      const aDistance = Math.min(...preferredTimes.map(pref => 
        Math.abs(this.parseTime(a.time) - this.parseTime(pref))
      ))
      const bDistance = Math.min(...preferredTimes.map(pref => 
        Math.abs(this.parseTime(b.time) - this.parseTime(pref))
      ))
      return aDistance - bDistance
    })

    return sortedSlots
  }
}