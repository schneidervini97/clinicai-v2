// ========================================================================
// APPOINTMENTS MODULE - TYPE DEFINITIONS
// ========================================================================

export interface Professional {
  id: string
  clinic_id: string
  user_id?: string
  name: string
  email?: string
  phone?: string
  specialty?: string
  registration_number?: string
  active: boolean
  created_at: string
  updated_at: string
}

export type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export interface Availability {
  id: string
  professional_id: string
  day_of_week: WeekDay
  start_time: string // HH:MM
  end_time: string // HH:MM
  is_available: boolean
  created_at: string
  updated_at: string
}

export interface ProfessionalSchedule {
  id: string
  professional_id: string
  weekday: number // 0=Sunday, 6=Saturday
  start_time: string // HH:MM format
  end_time: string
  lunch_start?: string
  lunch_end?: string
  appointment_duration: number // minutes
  active: boolean
  created_at: string
  updated_at: string
}

export interface ScheduleException {
  id: string
  professional_id: string
  date: string // YYYY-MM-DD
  type: 'holiday' | 'vacation' | 'sick_leave' | 'other'
  description?: string
  all_day: boolean
  start_time?: string
  end_time?: string
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  clinic_id: string
  patient_id: string
  professional_id: string
  date: string // YYYY-MM-DD
  start_time: string // HH:MM
  end_time: string // HH:MM
  status: AppointmentStatus
  type: AppointmentType
  notes?: string
  internal_notes?: string
  created_by?: string
  created_at: string
  updated_at: string
  
  // Joined data
  patient?: {
    id: string
    name: string
    phone: string
    email?: string
  }
  professional?: {
    id: string
    name: string
    specialty?: string
  }
}

export interface AppointmentHistory {
  id: string
  appointment_id: string
  action: 'created' | 'updated' | 'cancelled' | 'confirmed' | 'completed' | 'deleted'
  changed_by?: string
  changed_at: string
  previous_data?: Record<string, unknown>
  new_data?: Record<string, unknown>
  notes?: string
}

// ========================================================================
// ENUMS AND UNIONS
// ========================================================================

export type AppointmentStatus = 
  | 'scheduled'
  | 'confirmed' 
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export type AppointmentType = 
  | 'consultation'
  | 'return'
  | 'exam'
  | 'procedure'

export type CalendarView = 'day' | 'week' | 'month'

// ========================================================================
// FORM TYPES
// ========================================================================

export interface AppointmentFormData {
  patient_id: string
  professional_id: string
  date: Date
  start_time: string
  type: AppointmentType
  notes?: string
  internal_notes?: string
}

export interface ProfessionalFormData {
  name: string
  email?: string
  phone?: string
  specialty?: string
  registration_number?: string
  active: boolean
}

export interface ProfessionalScheduleFormData {
  professional_id: string
  weekday: number
  start_time: string
  end_time: string
  lunch_start?: string
  lunch_end?: string
  appointment_duration: number
  active: boolean
}

// ========================================================================
// SEARCH AND FILTER TYPES
// ========================================================================

export interface AppointmentFilters {
  patient_id?: string
  professional_id?: string
  status?: AppointmentStatus[]
  type?: AppointmentType[]
  date_from?: string
  date_to?: string
  search?: string
}

export interface AppointmentSearchResult {
  data: Appointment[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface ProfessionalFilters {
  specialty?: string
  active?: boolean
  search?: string
}

export interface AvailabilityFilters {
  professional_id?: string
  day_of_week?: WeekDay
  is_available?: boolean
}

export interface AvailabilitySearchResult {
  data: Availability[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

// ========================================================================
// CALENDAR TYPES
// ========================================================================

export interface TimeSlot {
  time: string
  available: boolean
  appointment?: Appointment
}

export interface CalendarDay {
  date: Date
  appointments: Appointment[]
  isToday: boolean
  isWeekend: boolean
}

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  color: string
  appointment: Appointment
}

export interface AvailabilitySlot {
  time: string
  available: boolean
  professional_id: string
  duration: number
}

// ========================================================================
// API RESPONSE TYPES
// ========================================================================

export interface CreateAppointmentResponse {
  appointment: Appointment
  success: boolean
  message: string
}

export interface UpdateAppointmentResponse {
  appointment: Appointment
  success: boolean
  message: string
}

export interface AvailabilityResponse {
  professional_id: string
  date: string
  slots: AvailabilitySlot[]
}

// ========================================================================
// UTILITY TYPES
// ========================================================================

export type CreateAppointmentInput = Omit<Appointment, 'id' | 'created_at' | 'updated_at' | 'clinic_id'>
export type UpdateAppointmentInput = Partial<Omit<Appointment, 'id' | 'created_at' | 'updated_at' | 'clinic_id'>>

export type CreateProfessionalInput = Omit<Professional, 'id' | 'created_at' | 'updated_at' | 'clinic_id'>
export type UpdateProfessionalInput = Partial<Omit<Professional, 'id' | 'created_at' | 'updated_at' | 'clinic_id'>>

export type CreateAvailabilityInput = Omit<Availability, 'id' | 'created_at' | 'updated_at'>
export type UpdateAvailabilityInput = Partial<Omit<Availability, 'id' | 'created_at' | 'updated_at' | 'professional_id'>>

// ========================================================================
// CONSTANTS
// ========================================================================

export const APPOINTMENT_STATUSES: Record<AppointmentStatus, { label: string; color: string }> = {
  scheduled: { label: 'Agendado', color: 'bg-blue-100 text-blue-800' },
  confirmed: { label: 'Confirmado', color: 'bg-green-100 text-green-800' },
  in_progress: { label: 'Em Andamento', color: 'bg-yellow-100 text-yellow-800' },
  completed: { label: 'Concluído', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
  no_show: { label: 'Faltou', color: 'bg-gray-100 text-gray-800' },
}

export const APPOINTMENT_TYPES: Record<AppointmentType, { label: string }> = {
  consultation: { label: 'Consulta' },
  return: { label: 'Retorno' },
  exam: { label: 'Exame' },
  procedure: { label: 'Procedimento' },
}

export const WEEKDAYS = [
  'Domingo',
  'Segunda-feira', 
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
]

export const SPECIALTIES = [
  'Cardiologia',
  'Dermatologia',
  'Endocrinologia',
  'Gastroenterologia',
  'Ginecologia',
  'Neurologia',
  'Oftalmologia',
  'Ortopedia',
  'Otorrinolaringologia',
  'Pediatria',
  'Pneumologia',
  'Psiquiatria',
  'Urologia',
  'Clínica Geral',
  'Outros'
]