// ========================================================================
// CLINIC MODULE - TYPES AND SCHEMAS
// ========================================================================

import { z } from 'zod'

// ========================================================================
// BASE INTERFACES
// ========================================================================

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

// ========================================================================
// VALIDATION SCHEMAS
// ========================================================================

export const updateClinicSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome da clínica deve ter pelo menos 2 caracteres')
    .max(100, 'Nome da clínica deve ter no máximo 100 caracteres'),
  
  phone: z
    .string()
    .min(14, 'Telefone deve ter formato (11) 9999-9999 ou (11) 99999-9999')
    .max(15, 'Telefone inválido'),
  
  specialties: z
    .array(z.string())
    .min(1, 'Selecione pelo menos uma especialidade')
    .max(10, 'Máximo de 10 especialidades'),
  
  cep: z
    .string()
    .min(9, 'CEP deve ter formato 00000-000')
    .max(9, 'CEP deve ter formato 00000-000'),
  
  address: z
    .string()
    .min(5, 'Endereço deve ter pelo menos 5 caracteres')
    .max(200, 'Endereço muito longo'),
  
  number: z
    .string()
    .min(1, 'Número é obrigatório')
    .max(10, 'Número muito longo'),
  
  complement: z
    .string()
    .max(100, 'Complemento muito longo')
    .optional()
    .or(z.literal('')),
  
  city: z
    .string()
    .min(2, 'Cidade deve ter pelo menos 2 caracteres')
    .max(100, 'Nome da cidade muito longo'),
  
  state: z
    .string()
    .length(2, 'Estado deve ter 2 caracteres')
    .toUpperCase()
})

// ========================================================================
// FORM TYPES
// ========================================================================

export type UpdateClinicFormData = z.infer<typeof updateClinicSchema>

// ========================================================================
// SPECIALTY OPTIONS
// ========================================================================

export const MEDICAL_SPECIALTIES = [
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
  'Psicologia',
  'Urologia',
  'Anestesiologia',
  'Cirurgia Geral',
  'Cirurgia Plástica',
  'Clínica Geral',
  'Medicina do Trabalho',
  'Medicina Esportiva',
  'Medicina de Família',
  'Reumatologia',
  'Hematologia',
  'Infectologia',
  'Nefrologia',
  'Oncologia',
  'Radiologia',
  'Patologia',
  'Medicina Nuclear',
  'Geriatria',
  'Nutrição',
  'Fisioterapia',
  'Fonoaudiologia',
  'Terapia Ocupacional',
  'Odontologia',
  'Outros'
] as const

export type MedicalSpecialty = typeof MEDICAL_SPECIALTIES[number]

// ========================================================================
// UTILITY FUNCTIONS
// ========================================================================

/**
 * Format clinic address as single string
 */
export const formatClinicAddress = (clinic: ClinicData): string => {
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
 * Get clinic display name with fallback
 */
export const getClinicDisplayName = (clinic: ClinicData | null): string => {
  return clinic?.name || 'Clínica'
}

/**
 * Format phone number for display
 */
export const formatClinicPhone = (phone: string): string => {
  // Remove all non-numeric characters
  const numbers = phone.replace(/\D/g, '')
  
  // Apply mask based on length
  if (numbers.length === 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`
  } else if (numbers.length === 11) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`
  }
  
  return phone
}

/**
 * Format CEP for display
 */
export const formatClinicCEP = (cep: string): string => {
  const numbers = cep.replace(/\D/g, '')
  if (numbers.length === 8) {
    return `${numbers.slice(0, 5)}-${numbers.slice(5)}`
  }
  return cep
}