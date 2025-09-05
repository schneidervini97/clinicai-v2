import type { SupabaseClient } from '@supabase/supabase-js'
import type { 
  Patient, 
  PatientInput, 
  PatientFilters, 
  PaginationParams,
  PatientSearchResult,
  PatientStats,
  PatientDocument,
  PatientHistory,
  PipelineHistory,
  FinancialTransaction,
  TimelineEvent
} from '../types/patient.types'

export class PatientService {

  // Get current user's clinic ID
  private static async getCurrentClinicId(supabase: SupabaseClient): Promise<string> {
    const client = supabase
    const { data: { user } } = await client.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: clinic, error } = await client
      .from('clinics')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (error || !clinic) throw new Error('Clinic not found')
    return clinic.id
  }

  // CRUD Operations
  static async create(patientData: PatientInput, supabase: SupabaseClient): Promise<Patient> {
    const client = supabase
    const clinic_id = await this.getCurrentClinicId(client)
    const { data: { user } } = await client.auth.getUser()

    // Clean up empty string fields and set proper defaults
    const cleanData = Object.fromEntries(
      Object.entries(patientData).filter(([, value]) => 
        value !== '' && value !== null && value !== undefined
      )
    )

    const { data, error } = await client
      .from('patients')
      .insert({
        ...cleanData,
        clinic_id,
        created_by: user?.id,
        status: patientData.status || 'active', // Garantir status padrão
        // Ensure arrays are properly formatted
        allergies: patientData.allergies || [],
        current_medications: patientData.current_medications || [],
        tags: patientData.tags || [],
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating patient:', error)
      throw new Error(error.message)
    }

    return data
  }

  static async findById(id: string, supabase: SupabaseClient): Promise<Patient | null> {
    const client = supabase
    const clinic_id = await this.getCurrentClinicId(client)

    const { data, error } = await client
      .from('patients')
      .select('*')
      .eq('id', id)
      .eq('clinic_id', clinic_id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(error.message)
    }

    return data
  }

  static async update(id: string, updates: Partial<PatientInput>, supabase: SupabaseClient): Promise<Patient> {
    const client = supabase
    const clinic_id = await this.getCurrentClinicId(client)

    // Get current patient data to check if CPF/email is changing
    const currentPatient = await this.findById(id, supabase)
    if (!currentPatient) {
      throw new Error('Patient not found')
    }

    // Create update object
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    // Handle CPF uniqueness - only update if it's actually changing
    if (!updates.cpf || updates.cpf.trim() === '') {
      // CPF is empty/null, allow it (set to null in database)
      updateData.cpf = null
    } else if (updates.cpf === currentPatient.cpf) {
      // CPF hasn't changed, remove from update to avoid unique constraint error
      delete updateData.cpf
    } else {
      // CPF is changing to a new value, check if new CPF already exists
      const { data: existingPatient } = await client
        .from('patients')
        .select('id')
        .eq('clinic_id', clinic_id)
        .eq('cpf', updates.cpf)
        .neq('id', id) // Exclude current patient
        .single()

      if (existingPatient) {
        throw new Error('Já existe um paciente com este CPF')
      }
    }

    // Handle email uniqueness - only update if it's actually changing
    if (!updates.email || updates.email.trim() === '') {
      // Email is empty/null, allow it (set to null in database)
      updateData.email = null
    } else if (updates.email === currentPatient.email) {
      // Email hasn't changed, remove from update to avoid unique constraint error
      delete updateData.email
    } else {
      // Email is changing to a new value, check if new email already exists
      const { data: existingPatient } = await client
        .from('patients')
        .select('id')
        .eq('clinic_id', clinic_id)
        .eq('email', updates.email)
        .neq('id', id) // Exclude current patient
        .single()

      if (existingPatient) {
        throw new Error('Já existe um paciente com este email')
      }
    }

    const { data, error } = await client
      .from('patients')
      .update(updateData)
      .eq('id', id)
      .eq('clinic_id', clinic_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating patient:', error)
      
      // Handle specific constraint errors with user-friendly messages
      if (error.code === '23505') {
        if (error.message.includes('cpf')) {
          throw new Error('Já existe um paciente com este CPF')
        } else if (error.message.includes('email')) {
          throw new Error('Já existe um paciente com este email')
        }
      }
      
      throw new Error(error.message)
    }

    return data
  }

  static async delete(id: string, supabase: SupabaseClient): Promise<void> {
    const client = supabase
    const clinic_id = await this.getCurrentClinicId(client)

    const { error } = await client
      .from('patients')
      .delete()
      .eq('id', id)
      .eq('clinic_id', clinic_id)

    if (error) {
      throw new Error(error.message)
    }
  }

  // Soft delete (archive)
  static async archive(id: string, supabase: SupabaseClient): Promise<Patient> {
    return this.update(id, { status: 'archived' }, supabase)
  }

  static async restore(id: string, supabase: SupabaseClient): Promise<Patient> {
    return this.update(id, { status: 'active' }, supabase)
  }

  // Search and filtering
  static async search(
    filters: PatientFilters = {},
    pagination: PaginationParams = {},
    supabase: SupabaseClient
  ): Promise<PatientSearchResult> {
    const client = supabase
    const clinic_id = await this.getCurrentClinicId(client)
    const {
      page = 1,
      per_page = 20,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = pagination

    let query = client
      .from('patients')
      .select('*', { count: 'exact' })
      .eq('clinic_id', clinic_id)

    // Apply filters
    if (filters.search) {
      const searchTerm = `%${filters.search}%`
      query = query.or(`name.ilike.${searchTerm},phone.ilike.${searchTerm},email.ilike.${searchTerm},cpf.ilike.${searchTerm}`)
    }

    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status)
    }

    if (filters.media_origin && filters.media_origin.length > 0) {
      query = query.in('media_origin', filters.media_origin)
    }

    if (filters.gender && filters.gender.length > 0) {
      query = query.in('gender', filters.gender)
    }

    if (filters.has_health_insurance !== undefined) {
      if (filters.has_health_insurance) {
        query = query.not('health_insurance', 'is', null)
      } else {
        query = query.is('health_insurance', null)
      }
    }

    if (filters.created_after) {
      query = query.gte('created_at', filters.created_after)
    }

    if (filters.created_before) {
      query = query.lte('created_at', filters.created_before)
    }

    if (filters.birthday_month) {
      query = query.eq('EXTRACT(MONTH FROM birth_date)', filters.birthday_month)
    }

    // Age filters (requires birth_date)
    if (filters.age_min || filters.age_max) {
      const currentYear = new Date().getFullYear()
      
      if (filters.age_max) {
        const minBirthYear = currentYear - filters.age_max
        query = query.gte('EXTRACT(YEAR FROM birth_date)', minBirthYear)
      }
      
      if (filters.age_min) {
        const maxBirthYear = currentYear - filters.age_min
        query = query.lte('EXTRACT(YEAR FROM birth_date)', maxBirthYear)
      }
    }

    // Tags filter (contains any of the specified tags)
    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags)
    }

    // Sorting
    const ascending = sort_order === 'asc'
    query = query.order(sort_by, { ascending })

    // Pagination
    const from = (page - 1) * per_page
    const to = from + per_page - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      throw new Error(error.message)
    }

    const total = count || 0
    const total_pages = Math.ceil(total / per_page)

    return {
      data: data || [],
      total,
      page,
      per_page,
      total_pages,
    }
  }

  // Quick searches
  static async findByCpf(cpf: string, supabase: SupabaseClient): Promise<Patient | null> {
    const client = supabase
    const clinic_id = await this.getCurrentClinicId(client)

    const { data, error } = await client
      .from('patients')
      .select('*')
      .eq('clinic_id', clinic_id)
      .eq('cpf', cpf)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(error.message)
    }

    return data
  }

  static async findByPhone(phone: string, supabase: SupabaseClient): Promise<Patient | null> {
    const client = supabase
    const clinic_id = await this.getCurrentClinicId(client)

    const { data, error } = await client
      .from('patients')
      .select('*')
      .eq('clinic_id', clinic_id)
      .eq('phone', phone)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(error.message)
    }

    return data
  }

  static async findByEmail(email: string, supabase: SupabaseClient): Promise<Patient | null> {
    const client = supabase
    const clinic_id = await this.getCurrentClinicId(client)

    const { data, error } = await client
      .from('patients')
      .select('*')
      .eq('clinic_id', clinic_id)
      .eq('email', email)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(error.message)
    }

    return data
  }

  // Statistics
  static async getStats(supabase: SupabaseClient): Promise<PatientStats> {
    const client = supabase
    const clinic_id = await this.getCurrentClinicId(client)

    const { data, error } = await client
      .from('patient_stats')
      .select('*')
      .eq('clinic_id', clinic_id)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data
  }

  // Related data operations
  static async getDocuments(patientId: string, supabase: SupabaseClient): Promise<PatientDocument[]> {
    const client = supabase
    const clinic_id = await this.getCurrentClinicId(client)

    const { data, error } = await client
      .from('patient_documents')
      .select('*')
      .eq('patient_id', patientId)
      .eq('clinic_id', clinic_id)
      .order('uploaded_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return data || []
  }

  static async getHistory(patientId: string, supabase: SupabaseClient): Promise<PatientHistory[]> {
    const client = supabase
    const clinic_id = await this.getCurrentClinicId(client)

    const { data, error } = await client
      .from('patient_history')
      .select('*')
      .eq('patient_id', patientId)
      .eq('clinic_id', clinic_id)
      .order('changed_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return data || []
  }

  static async getPipelineHistory(patientId: string, supabase: SupabaseClient): Promise<PipelineHistory[]> {
    const client = supabase
    const clinic_id = await this.getCurrentClinicId(client)

    const { data, error } = await client
      .from('pipeline_history')
      .select('*')
      .eq('patient_id', patientId)
      .eq('clinic_id', clinic_id)
      .order('entered_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return data || []
  }

  static async getFinancialTransactions(patientId: string, supabase: SupabaseClient): Promise<FinancialTransaction[]> {
    const client = supabase
    const clinic_id = await this.getCurrentClinicId(client)

    const { data, error } = await client
      .from('financial_transactions')
      .select('*')
      .eq('patient_id', patientId)
      .eq('clinic_id', clinic_id)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return data || []
  }

  // Timeline (combined events)
  static async getTimeline(patientId: string, supabase: SupabaseClient): Promise<TimelineEvent[]> {
    const [history, pipelineHistory, transactions] = await Promise.all([
      this.getHistory(patientId, supabase),
      this.getPipelineHistory(patientId, supabase),
      this.getFinancialTransactions(patientId, supabase),
    ])

    const events: TimelineEvent[] = []

    // Add history events
    history.forEach((h) => {
      events.push({
        id: h.id,
        type: h.action as 'created' | 'updated' | 'deleted' | 'archived' | 'restored' | 'merged',
        title: `Paciente ${h.action === 'created' ? 'criado' : 'atualizado'}`,
        description: h.notes || undefined,
        date: h.changed_at,
        metadata: { action: h.action, field: h.field_changed },
      })
    })

    // Add pipeline events
    pipelineHistory.forEach((p) => {
      events.push({
        id: p.id,
        type: 'pipeline',
        title: `Movido para ${p.stage}`,
        description: p.notes || undefined,
        date: p.entered_at,
        metadata: { stage: p.stage, previous_stage: p.previous_stage },
      })
    })

    // Add financial events
    transactions.forEach((t) => {
      events.push({
        id: t.id,
        type: 'payment',
        title: `${t.transaction_type === 'payment' ? 'Pagamento' : 'Transação'} - ${t.status}`,
        description: t.description || undefined,
        date: t.created_at,
        metadata: { amount: t.amount, type: t.transaction_type, status: t.status },
      })
    })

    // Sort by date (most recent first)
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  // Bulk operations
  static async bulkUpdate(patientIds: string[], updates: Partial<PatientInput>, supabase: SupabaseClient): Promise<Patient[]> {
    const client = supabase
    const clinic_id = await this.getCurrentClinicId(client)

    const { data, error } = await client
      .from('patients')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('clinic_id', clinic_id)
      .in('id', patientIds)
      .select()

    if (error) {
      throw new Error(error.message)
    }

    return data || []
  }

  static async bulkArchive(patientIds: string[], supabase: SupabaseClient): Promise<Patient[]> {
    return this.bulkUpdate(patientIds, { status: 'archived' }, supabase)
  }

  static async bulkDelete(patientIds: string[], supabase: SupabaseClient): Promise<void> {
    const client = supabase
    const clinic_id = await this.getCurrentClinicId(client)

    const { error } = await client
      .from('patients')
      .delete()
      .eq('clinic_id', clinic_id)
      .in('id', patientIds)

    if (error) {
      throw new Error(error.message)
    }
  }

  // Validation helpers
  static async checkCpfExists(cpf: string, excludeId: string | undefined, supabase: SupabaseClient): Promise<boolean> {
    const client = supabase
    const clinic_id = await this.getCurrentClinicId(client)

    let query = client
      .from('patients')
      .select('id')
      .eq('clinic_id', clinic_id)
      .eq('cpf', cpf)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return (data?.length || 0) > 0
  }

  static async checkEmailExists(email: string, excludeId: string | undefined, supabase: SupabaseClient): Promise<boolean> {
    const client = supabase
    const clinic_id = await this.getCurrentClinicId(client)

    let query = client
      .from('patients')
      .select('id')
      .eq('clinic_id', clinic_id)
      .eq('email', email)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return (data?.length || 0) > 0
  }

  // Get birthdays for a specific month
  static async getBirthdays(month: number | undefined, supabase: SupabaseClient): Promise<Patient[]> {
    const client = supabase
    const clinic_id = await this.getCurrentClinicId(client)
    const targetMonth = month || new Date().getMonth() + 1

    const { data, error } = await client
      .from('patients')
      .select('*')
      .eq('clinic_id', clinic_id)
      .eq('status', 'active')
      .not('birth_date', 'is', null)
      .eq('EXTRACT(MONTH FROM birth_date)', targetMonth)
      .order('EXTRACT(DAY FROM birth_date)', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return data || []
  }
}