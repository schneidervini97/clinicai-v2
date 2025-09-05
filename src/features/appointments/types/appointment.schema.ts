// ========================================================================
// APPOINTMENTS MODULE - SCHEMA VALIDATION
// ========================================================================

import { z } from 'zod'

// ========================================================================
// PROFESSIONAL SCHEMAS
// ========================================================================

export const professionalSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  specialty: z.string().optional(),
  registration_number: z.string().optional(),
  active: z.boolean().default(true),
})

export const professionalScheduleSchema = z.object({
  professional_id: z.string().uuid('ID do profissional inválido'),
  weekday: z.number().min(0).max(6),
  start_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário inválido'),
  end_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário inválido'),
  lunch_start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário inválido').optional().or(z.literal('')),
  lunch_end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário inválido').optional().or(z.literal('')),
  appointment_duration: z.number().min(15).max(120).default(30),
  active: z.boolean().default(true),
}).refine((data) => {
  // End time must be after start time
  const start = data.start_time.split(':').map(Number)
  const end = data.end_time.split(':').map(Number)
  const startMinutes = start[0] * 60 + start[1]
  const endMinutes = end[0] * 60 + end[1]
  return endMinutes > startMinutes
}, {
  message: 'Horário de fim deve ser posterior ao horário de início',
  path: ['end_time']
}).refine((data) => {
  // If lunch times are provided, validate them
  if (data.lunch_start && data.lunch_end) {
    const lunchStart = data.lunch_start.split(':').map(Number)
    const lunchEnd = data.lunch_end.split(':').map(Number)
    const lunchStartMinutes = lunchStart[0] * 60 + lunchStart[1]
    const lunchEndMinutes = lunchEnd[0] * 60 + lunchEnd[1]
    return lunchEndMinutes > lunchStartMinutes
  }
  return true
}, {
  message: 'Horário de fim do almoço deve ser posterior ao horário de início',
  path: ['lunch_end']
})

// ========================================================================
// APPOINTMENT SCHEMAS
// ========================================================================

export const appointmentSchema = z.object({
  patient_id: z.string().uuid('Paciente é obrigatório'),
  professional_id: z.string().uuid('Profissional é obrigatório'),
  consultation_type_id: z.string().uuid('Tipo de consulta é obrigatório'),
  date: z.date({
    required_error: 'Data é obrigatória',
    invalid_type_error: 'Data inválida'
  }),
  start_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário inválido'),
  // Legacy type field for backward compatibility
  type: z.enum(['consultation', 'return', 'exam', 'procedure']).optional(),
  notes: z.string().optional(),
  internal_notes: z.string().optional(),
}).refine((data) => {
  // Date cannot be in the past (only check date, not time)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const appointmentDate = new Date(data.date)
  appointmentDate.setHours(0, 0, 0, 0)
  return appointmentDate >= today
}, {
  message: 'Data não pode ser no passado',
  path: ['date']
})

export const appointmentUpdateSchema = appointmentSchema.partial().extend({
  status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']).optional()
})

// ========================================================================
// SCHEDULE EXCEPTION SCHEMAS
// ========================================================================

export const scheduleExceptionSchema = z.object({
  professional_id: z.string().uuid('Profissional é obrigatório'),
  date: z.date({
    required_error: 'Data é obrigatória'
  }),
  type: z.enum(['holiday', 'vacation', 'sick_leave', 'other'], {
    required_error: 'Tipo é obrigatório'
  }),
  description: z.string().optional(),
  all_day: z.boolean().default(true),
  start_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário inválido').optional().or(z.literal('')),
  end_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário inválido').optional().or(z.literal('')),
}).refine((data) => {
  // If not all day, start and end times are required
  if (!data.all_day) {
    return data.start_time && data.end_time
  }
  return true
}, {
  message: 'Horários de início e fim são obrigatórios quando não for o dia todo',
  path: ['start_time']
}).refine((data) => {
  // If times are provided, end must be after start
  if (data.start_time && data.end_time && data.start_time !== '' && data.end_time !== '') {
    const start = data.start_time.split(':').map(Number)
    const end = data.end_time.split(':').map(Number)
    const startMinutes = start[0] * 60 + start[1]
    const endMinutes = end[0] * 60 + end[1]
    return endMinutes > startMinutes
  }
  return true
}, {
  message: 'Horário de fim deve ser posterior ao horário de início',
  path: ['end_time']
})

// ========================================================================
// FILTER SCHEMAS
// ========================================================================

export const appointmentFiltersSchema = z.object({
  patient_id: z.string().uuid().optional(),
  professional_id: z.string().uuid().optional(),
  status: z.array(z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'])).optional(),
  type: z.array(z.enum(['consultation', 'return', 'exam', 'procedure'])).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  search: z.string().optional(),
})

export const professionalFiltersSchema = z.object({
  specialty: z.string().optional(),
  active: z.boolean().optional(),
  search: z.string().optional(),
})

// ========================================================================
// PAGINATION SCHEMA
// ========================================================================

export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  per_page: z.number().min(1).max(100).default(20),
  sort_by: z.string().default('date'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
})

// ========================================================================
// TIME HELPERS
// ========================================================================

export const timeSlotSchema = z.object({
  professional_id: z.string().uuid(),
  date: z.date(),
  duration: z.number().min(15).max(120).default(30)
})

// ========================================================================
// QUICK ACTIONS SCHEMAS
// ========================================================================

export const confirmAppointmentSchema = z.object({
  appointment_id: z.string().uuid('ID do agendamento inválido'),
  notes: z.string().optional()
})

export const cancelAppointmentSchema = z.object({
  appointment_id: z.string().uuid('ID do agendamento inválido'),
  reason: z.string().min(1, 'Motivo do cancelamento é obrigatório'),
  offer_reschedule: z.boolean().default(false)
})

export const completeAppointmentSchema = z.object({
  appointment_id: z.string().uuid('ID do agendamento inválido'),
  internal_notes: z.string().optional(),
  next_appointment_needed: z.boolean().default(false),
  next_appointment_type: z.enum(['consultation', 'return', 'exam', 'procedure']).optional()
})

// ========================================================================
// BULK OPERATIONS SCHEMAS
// ========================================================================

export const bulkUpdateAppointmentsSchema = z.object({
  appointment_ids: z.array(z.string().uuid()).min(1, 'Pelo menos um agendamento deve ser selecionado'),
  status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']).optional(),
  professional_id: z.string().uuid().optional(),
  notes: z.string().optional()
})

// ========================================================================
// EXPORT INFERRED TYPES
// ========================================================================

export type ProfessionalFormData = z.infer<typeof professionalSchema>
export type ProfessionalScheduleFormData = z.infer<typeof professionalScheduleSchema>
export type AppointmentFormData = z.infer<typeof appointmentSchema>
export type AppointmentUpdateFormData = z.infer<typeof appointmentUpdateSchema>
export type ScheduleExceptionFormData = z.infer<typeof scheduleExceptionSchema>
export type AppointmentFilters = z.infer<typeof appointmentFiltersSchema>
export type ProfessionalFilters = z.infer<typeof professionalFiltersSchema>
export type PaginationParams = z.infer<typeof paginationSchema>