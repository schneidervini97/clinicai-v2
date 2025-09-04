// Base types for Patient module
export interface Patient {
  id: string
  clinic_id: string
  
  // Basic Data
  name: string
  phone: string
  email?: string | null
  cpf?: string | null
  media_origin?: string | null
  
  // Personal Data
  birth_date?: string | null
  gender?: 'male' | 'female' | 'other' | null
  rg?: string | null
  photo_url?: string | null
  
  // Address
  cep?: string | null
  address?: string | null
  address_number?: string | null
  address_complement?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  
  // Medical Data
  allergies?: string[] | null
  current_medications?: string[] | null
  medical_notes?: string | null
  blood_type?: string | null
  health_insurance?: string | null
  health_insurance_number?: string | null
  
  // Relationship Data
  status: 'active' | 'inactive' | 'archived'
  first_appointment_date?: string | null
  last_appointment_date?: string | null
  tags?: string[] | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  
  // Marketing/Commercial
  referral_details?: string | null
  lgpd_consent: boolean
  lgpd_consent_date?: string | null
  whatsapp_consent: boolean
  email_marketing_consent: boolean
  nps_score?: number | null
  last_nps_date?: string | null
  
  // Control Fields
  created_at: string
  updated_at: string
  created_by?: string | null
  internal_notes?: string | null
}

// Input type for creating a new patient
export interface PatientInput {
  // Basic Data (Required)
  name: string
  phone: string
  email?: string
  cpf?: string
  media_origin?: string
  
  // Personal Data
  birth_date?: string
  gender?: 'male' | 'female' | 'other'
  rg?: string
  photo_url?: string
  
  // Address
  cep?: string
  address?: string
  address_number?: string
  address_complement?: string
  neighborhood?: string
  city?: string
  state?: string
  
  // Medical Data
  allergies?: string[]
  current_medications?: string[]
  medical_notes?: string
  blood_type?: string
  health_insurance?: string
  health_insurance_number?: string
  
  // Relationship Data
  emergency_contact_name?: string
  emergency_contact_phone?: string
  tags?: string[]
  
  // Marketing/Commercial
  referral_details?: string
  lgpd_consent?: boolean
  whatsapp_consent?: boolean
  email_marketing_consent?: boolean
  
  // Control Fields
  internal_notes?: string
}

// Update type - all fields optional except id
export interface PatientUpdate extends Partial<PatientInput> {
  id: string
}

// Search/Filter types
export interface PatientFilters {
  search?: string // Search in name, phone, email, cpf
  status?: Patient['status'][]
  media_origin?: string[]
  tags?: string[]
  age_min?: number
  age_max?: number
  gender?: Patient['gender'][]
  has_health_insurance?: boolean
  created_after?: string
  created_before?: string
  birthday_month?: number
  clinic_id?: string
}

// Pagination
export interface PaginationParams {
  page?: number
  per_page?: number
  sort_by?: keyof Patient
  sort_order?: 'asc' | 'desc'
}

// Search result
export interface PatientSearchResult {
  data: Patient[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

// Related entities
export interface PatientDocument {
  id: string
  patient_id: string
  clinic_id: string
  document_type: string
  document_name: string
  document_url: string
  file_size?: number | null
  mime_type?: string | null
  uploaded_by?: string | null
  uploaded_at: string
  notes?: string | null
}

export interface PatientHistory {
  id: string
  patient_id: string
  clinic_id: string
  action: 'created' | 'updated' | 'deleted' | 'archived' | 'restored' | 'merged'
  field_changed?: string | null
  old_value?: string | null
  new_value?: string | null
  changed_by?: string | null
  changed_at: string
  ip_address?: string | null
  user_agent?: string | null
  notes?: string | null
}

export interface PipelineHistory {
  id: string
  patient_id: string
  clinic_id: string
  stage: string
  previous_stage?: string | null
  entered_at: string
  exited_at?: string | null
  duration_minutes?: number | null
  moved_by?: string | null
  notes?: string | null
  outcome?: string | null
}

export interface FinancialTransaction {
  id: string
  patient_id: string
  clinic_id: string
  transaction_type: 'payment' | 'refund' | 'adjustment'
  amount: number
  payment_method?: string | null
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  description?: string | null
  service_date?: string | null
  payment_date?: string | null
  invoice_number?: string | null
  receipt_url?: string | null
  created_at: string
  created_by?: string | null
  notes?: string | null
}

// Statistics
export interface PatientStats {
  clinic_id: string
  total_patients: number
  active_patients: number
  inactive_patients: number
  archived_patients: number
  new_patients_30d: number
  birthdays_this_month: number
}

// Timeline event (combines different types of events)
export interface TimelineEvent {
  id: string
  type: 'created' | 'updated' | 'appointment' | 'pipeline' | 'payment' | 'document' | 'note'
  title: string
  description?: string
  date: string
  user?: string
  metadata?: Record<string, unknown>
}

// Import/Export
export interface ImportResult {
  total_rows: number
  successful_imports: number
  failed_imports: number
  errors: {
    row: number
    field: string
    message: string
  }[]
}

export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'pdf'
  include_fields: (keyof Patient)[]
  filters?: PatientFilters
}

// Form validation errors
export interface PatientFormErrors {
  [key: string]: string | undefined
}

// Media origin options (can be configured per clinic)
export const MEDIA_ORIGINS = [
  'Google Ads',
  'Facebook Ads',
  'Instagram',
  'WhatsApp',
  'Site',
  'Indicação',
  'Panfleto',
  'Rádio',
  'TV',
  'Outros'
] as const

export type MediaOrigin = typeof MEDIA_ORIGINS[number]

// Blood type options
export const BLOOD_TYPES = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
] as const

export type BloodType = typeof BLOOD_TYPES[number]

// Brazilian states
export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
] as const

export type BrazilianState = typeof BRAZILIAN_STATES[number]