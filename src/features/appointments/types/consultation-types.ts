// ========================================================================
// CONSULTATION TYPES - TYPESCRIPT INTERFACES
// ========================================================================

import { z } from 'zod'

// ========================================================================
// BASE INTERFACES
// ========================================================================

export interface ConsultationType {
  id: string
  clinic_id: string
  name: string
  description?: string
  duration: number
  price?: number
  color: string
  active: boolean
  is_default: boolean
  requires_preparation: boolean
  preparation_instructions?: string
  created_at: string
  updated_at: string
}

export interface ProfessionalConsultationType {
  id: string
  professional_id: string
  consultation_type_id: string
  custom_duration?: number
  custom_price?: number
  available: boolean
  created_at: string
  updated_at: string
}

// Extended interface with professional customizations
export interface ConsultationTypeWithCustomizations extends ConsultationType {
  custom_duration?: number
  custom_price?: number
  final_duration: number
  final_price?: number
}

// ========================================================================
// INPUT SCHEMAS AND TYPES
// ========================================================================

export const createConsultationTypeSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  description: z.string().optional(),
  duration: z.number().min(5, 'Duração mínima de 5 minutos').max(480, 'Duração máxima de 8 horas'),
  price: z.number().min(0, 'Preço deve ser positivo').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor deve estar no formato hexadecimal (#RRGGBB)'),
  requires_preparation: z.boolean().optional().default(false),
  preparation_instructions: z.string().optional(),
  is_default: z.boolean().optional().default(false),
  active: z.boolean().optional().default(true)
})

export const updateConsultationTypeSchema = createConsultationTypeSchema.partial()

export const professionalConsultationTypeSchema = z.object({
  professional_id: z.string().uuid('ID do profissional inválido'),
  consultation_type_id: z.string().uuid('ID do tipo de consulta inválido'),
  custom_duration: z.number().min(5, 'Duração mínima de 5 minutos').max(480, 'Duração máxima de 8 horas').optional(),
  custom_price: z.number().min(0, 'Preço deve ser positivo').optional(),
  available: z.boolean().optional().default(true)
})

export const updateProfessionalConsultationTypeSchema = professionalConsultationTypeSchema.omit({
  professional_id: true,
  consultation_type_id: true
})

export type CreateConsultationTypeInput = z.infer<typeof createConsultationTypeSchema>
export type UpdateConsultationTypeInput = z.infer<typeof updateConsultationTypeSchema>
export type ProfessionalConsultationTypeInput = z.infer<typeof professionalConsultationTypeSchema>
export type UpdateProfessionalConsultationTypeInput = z.infer<typeof updateProfessionalConsultationTypeSchema>

// ========================================================================
// FILTER AND PAGINATION TYPES
// ========================================================================

export interface ConsultationTypeFilters {
  search?: string
  active?: boolean
  professional_id?: string
}

export interface PaginationParams {
  page?: number
  per_page?: number
  sort_by?: 'name' | 'duration' | 'price' | 'created_at'
  sort_order?: 'asc' | 'desc'
}

// ========================================================================
// PREDEFINED COLORS
// ========================================================================

export const CONSULTATION_TYPE_COLORS = [
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Verde', value: '#10B981' },
  { name: 'Amarelo', value: '#F59E0B' },
  { name: 'Vermelho', value: '#EF4444' },
  { name: 'Roxo', value: '#8B5CF6' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Índigo', value: '#6366F1' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Laranja', value: '#F97316' },
  { name: 'Cinza', value: '#6B7280' },
] as const

// ========================================================================
// UTILITY FUNCTIONS
// ========================================================================

export const formatPrice = (price?: number): string => {
  if (!price) return 'Não definido'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price)
}

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) {
    return `${hours}h`
  }
  return `${hours}h ${remainingMinutes}min`
}

export const getConsultationTypeColor = (color: string): string => {
  const colorEntry = CONSULTATION_TYPE_COLORS.find(c => c.value === color)
  return colorEntry?.name || 'Personalizada'
}

// Default consultation types for new clinics
export const DEFAULT_CONSULTATION_TYPES = [
  {
    name: 'Consulta',
    description: 'Consulta médica padrão',
    duration: 30,
    color: '#3B82F6',
    is_default: true
  },
  {
    name: 'Retorno',
    description: 'Consulta de retorno',
    duration: 30,
    color: '#10B981',
    is_default: false
  },
  {
    name: 'Exame',
    description: 'Realização de exames',
    duration: 45,
    color: '#F59E0B',
    is_default: false
  },
  {
    name: 'Procedimento',
    description: 'Procedimento médico',
    duration: 60,
    color: '#EF4444',
    is_default: false
  },
  {
    name: 'Primeira Consulta',
    description: 'Primeira consulta com anamnese completa',
    duration: 60,
    color: '#8B5CF6',
    is_default: false
  }
] as const