import { z } from 'zod'
import { BRAZILIAN_STATES, BLOOD_TYPES } from './patient.types'

// Helper schemas
const phoneSchema = z
  .string()
  .min(14, 'Telefone deve ter formato (11) 9999-9999')
  .max(15, 'Telefone deve ter formato (11) 99999-9999')

const optionalPhoneSchema = z
  .string()
  .optional()
  .refine((phone) => {
    if (!phone || phone === '') return true
    return phone.length >= 14 && phone.length <= 15
  }, 'Telefone deve ter formato (11) 9999-9999')
  .transform(val => val === '' ? undefined : val)

const cpfSchema = z
  .string()
  .optional()
  .refine((cpf) => {
    if (!cpf) return true
    // Remove non-numeric characters
    const numbers = cpf.replace(/\D/g, '')
    
    // Check if has 11 digits
    if (numbers.length !== 11) return false
    
    // Check if all digits are the same
    if (/^(\d)\1{10}$/.test(numbers)) return false
    
    // Validate CPF algorithm
    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += parseInt(numbers.charAt(i)) * (10 - i)
    }
    let remainder = 11 - (sum % 11)
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== parseInt(numbers.charAt(9))) return false
    
    sum = 0
    for (let i = 0; i < 10; i++) {
      sum += parseInt(numbers.charAt(i)) * (11 - i)
    }
    remainder = 11 - (sum % 11)
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== parseInt(numbers.charAt(10))) return false
    
    return true
  }, 'CPF inválido')

const emailSchema = z
  .string()
  .email('Email deve ter formato válido')
  .optional()
  .or(z.literal(''))
  .transform(val => val === '' ? undefined : val)

const cepSchema = z
  .string()
  .optional()
  .refine((cep) => {
    if (!cep) return true
    return /^\d{5}-?\d{3}$/.test(cep)
  }, 'CEP deve ter formato 00000-000')

const dateSchema = z
  .string()
  .optional()
  .transform(val => val === '' ? undefined : val)
  .refine((date) => {
    if (!date) return true
    return !isNaN(Date.parse(date))
  }, 'Data deve ser válida')
  .refine((date) => {
    if (!date) return true
    const parsedDate = new Date(date)
    const today = new Date()
    return parsedDate <= today
  }, 'Data não pode ser futura')

const birthDateSchema = z
  .string()
  .optional()
  .transform(val => val === '' ? undefined : val)
  .refine((date) => {
    if (!date) return true
    const parsedDate = new Date(date)
    const today = new Date()
    const minDate = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate())
    return parsedDate >= minDate && parsedDate <= today
  }, 'Data de nascimento deve ser entre hoje e 120 anos atrás')

// Main patient schema for forms
export const patientSchema = z.object({
  // Required fields
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim(),
  
  phone: phoneSchema,
  
  media_origin: z
    .string()
    .min(1, 'Origem de mídia é obrigatória'),
  
  // Optional basic fields
  email: emailSchema,
  cpf: cpfSchema,
  
  // Personal data
  birth_date: birthDateSchema,
  gender: z.enum(['male', 'female', 'other']).optional(),
  rg: z
    .string()
    .optional()
    .transform(val => val === '' ? undefined : val)
    .refine((rg) => {
      if (!rg) return true
      return rg.length >= 7 && rg.length <= 12
    }, 'RG deve ter entre 7 e 12 caracteres'),
  
  // Address
  cep: cepSchema,
  address: z.string().max(200, 'Endereço muito longo').optional().transform(val => val === '' ? undefined : val),
  address_number: z.string().max(10, 'Número muito longo').optional().transform(val => val === '' ? undefined : val),
  address_complement: z.string().max(100, 'Complemento muito longo').optional().transform(val => val === '' ? undefined : val),
  neighborhood: z.string().max(100, 'Bairro muito longo').optional().transform(val => val === '' ? undefined : val),
  city: z.string().max(100, 'Cidade muito longa').optional().transform(val => val === '' ? undefined : val),
  state: z.enum(BRAZILIAN_STATES).optional(),
  
  // Medical data
  allergies: z.array(z.string()).optional().default([]),
  current_medications: z.array(z.string()).optional().default([]),
  medical_notes: z.string().max(1000, 'Observações médicas muito longas').optional().transform(val => val === '' ? undefined : val),
  blood_type: z.enum(BLOOD_TYPES).optional(),
  health_insurance: z.string().max(100, 'Nome do convênio muito longo').optional().transform(val => val === '' ? undefined : val),
  health_insurance_number: z.string().max(50, 'Número do convênio muito longo').optional().transform(val => val === '' ? undefined : val),
  
  // Relationship data
  emergency_contact_name: z.string().max(100, 'Nome do contato muito longo').optional().transform(val => val === '' ? undefined : val),
  emergency_contact_phone: optionalPhoneSchema,
  tags: z.array(z.string()).optional().default([]),
  
  // Marketing/Commercial
  referral_details: z.string().max(500, 'Detalhes da indicação muito longos').optional().transform(val => val === '' ? undefined : val),
  lgpd_consent: z.boolean().default(false),
  whatsapp_consent: z.boolean().default(false),
  email_marketing_consent: z.boolean().default(false),
  
  // Control fields
  internal_notes: z.string().max(1000, 'Observações internas muito longas').optional().transform(val => val === '' ? undefined : val),
})

// Schema for patient updates (all fields optional except id)
export const patientUpdateSchema = patientSchema.partial().extend({
  id: z.string().uuid('ID deve ser um UUID válido'),
})

// Schema for search/filters
export const patientFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.array(z.enum(['active', 'inactive', 'archived'])).optional(),
  media_origin: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  age_min: z.number().min(0).max(120).optional(),
  age_max: z.number().min(0).max(120).optional(),
  gender: z.array(z.enum(['male', 'female', 'other'])).optional(),
  has_health_insurance: z.boolean().optional(),
  created_after: dateSchema,
  created_before: dateSchema,
  birthday_month: z.number().min(1).max(12).optional(),
  clinic_id: z.string().uuid().optional(),
})

// Schema for pagination
export const paginationSchema = z.object({
  page: z.number().min(1).optional().default(1),
  per_page: z.number().min(1).max(100).optional().default(20),
  sort_by: z.string().optional().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
})

// Schema for document upload
export const patientDocumentSchema = z.object({
  patient_id: z.string().uuid('ID do paciente deve ser um UUID válido'),
  document_type: z
    .string()
    .min(1, 'Tipo do documento é obrigatório')
    .max(50, 'Tipo do documento muito longo'),
  document_name: z
    .string()
    .min(1, 'Nome do documento é obrigatório')
    .max(200, 'Nome do documento muito longo'),
  notes: z.string().max(500, 'Observações muito longas').optional(),
})

// Schema for financial transaction
export const financialTransactionSchema = z.object({
  patient_id: z.string().uuid('ID do paciente deve ser um UUID válido'),
  transaction_type: z.enum(['payment', 'refund', 'adjustment']),
  amount: z
    .number()
    .positive('Valor deve ser positivo')
    .max(999999.99, 'Valor muito alto'),
  payment_method: z.string().max(50, 'Método de pagamento muito longo').optional(),
  status: z.enum(['pending', 'completed', 'failed', 'cancelled']).default('pending'),
  description: z.string().max(200, 'Descrição muito longa').optional(),
  service_date: dateSchema,
  payment_date: dateSchema,
  invoice_number: z.string().max(50, 'Número da nota fiscal muito longo').optional(),
  notes: z.string().max(500, 'Observações muito longas').optional(),
})

// Schema for pipeline history
export const pipelineHistorySchema = z.object({
  patient_id: z.string().uuid('ID do paciente deve ser um UUID válido'),
  stage: z.string().min(1, 'Etapa é obrigatória').max(50, 'Nome da etapa muito longo'),
  previous_stage: z.string().max(50, 'Nome da etapa anterior muito longo').optional(),
  notes: z.string().max(500, 'Observações muito longas').optional(),
  outcome: z.string().max(50, 'Resultado muito longo').optional(),
})

// Schema for import validation
export const importRowSchema = patientSchema.extend({
  row_number: z.number().positive(),
})

// Schema for export options
export const exportOptionsSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'pdf']),
  include_fields: z.array(z.string()).min(1, 'Selecione pelo menos um campo'),
  filters: patientFiltersSchema.optional(),
})

// Schema for bulk operations
export const bulkOperationSchema = z.object({
  patient_ids: z.array(z.string().uuid()).min(1, 'Selecione pelo menos um paciente'),
  operation: z.enum(['archive', 'activate', 'delete', 'add_tag', 'remove_tag', 'export']),
  data: z.record(z.any()).optional(), // Additional data for the operation
})

// NPS score schema
export const npsSchema = z.object({
  patient_id: z.string().uuid('ID do paciente deve ser um UUID válido'),
  score: z.number().min(0, 'Score deve ser entre 0 e 10').max(10, 'Score deve ser entre 0 e 10'),
  feedback: z.string().max(1000, 'Feedback muito longo').optional(),
})

// Type inference from schemas
export type PatientFormData = z.infer<typeof patientSchema>
export type PatientUpdateData = z.infer<typeof patientUpdateSchema>
export type PatientFiltersData = z.infer<typeof patientFiltersSchema>
export type PaginationData = z.infer<typeof paginationSchema>
export type PatientDocumentData = z.infer<typeof patientDocumentSchema>
export type FinancialTransactionData = z.infer<typeof financialTransactionSchema>
export type PipelineHistoryData = z.infer<typeof pipelineHistorySchema>
export type ImportRowData = z.infer<typeof importRowSchema>
export type ExportOptionsData = z.infer<typeof exportOptionsSchema>
export type BulkOperationData = z.infer<typeof bulkOperationSchema>
export type NpsData = z.infer<typeof npsSchema>