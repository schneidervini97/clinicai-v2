import { Patient } from '@/features/patients/types/patient.types'

// Pipeline stages enum
export type PipelineStage = 
  | 'LEAD'
  | 'CONTATO_INICIAL' 
  | 'AGENDAMENTO'
  | 'COMPARECIMENTO'
  | 'FECHAMENTO'
  | 'DESISTENCIA'

// Pipeline stage configuration
export interface PipelineStageConfig {
  id: PipelineStage
  name: string
  color: string
  bgColor: string
  textColor: string
  icon: string
}

// Patient with pipeline data
export interface PipelinePatient extends Patient {
  pipeline_stage: PipelineStage
  pipeline_entered_at: string
  days_in_stage?: number
}

// Pipeline board data
export type PipelineBoardData = Record<PipelineStage, PipelinePatient[]>

// Pipeline stage counts
export interface PipelineStageCount {
  stage: PipelineStage
  count: number
}

// Pipeline history entry
export interface PipelineHistoryEntry {
  id: string
  patient_id: string
  stage: PipelineStage
  previous_stage: PipelineStage | null
  entered_at: string
  changed_by: string | null
  notes?: string
}

// Pipeline stage configurations
export const PIPELINE_STAGES: Record<PipelineStage, PipelineStageConfig> = {
  LEAD: {
    id: 'LEAD',
    name: 'Lead',
    color: 'bg-slate-100 border-slate-200',
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-700',
    icon: '🎯'
  },
  CONTATO_INICIAL: {
    id: 'CONTATO_INICIAL',
    name: 'Contato Inicial',
    color: 'bg-blue-100 border-blue-200',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    icon: '📞'
  },
  AGENDAMENTO: {
    id: 'AGENDAMENTO',
    name: 'Agendamento',
    color: 'bg-yellow-100 border-yellow-200',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    icon: '📅'
  },
  COMPARECIMENTO: {
    id: 'COMPARECIMENTO',
    name: 'Comparecimento',
    color: 'bg-purple-100 border-purple-200',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    icon: '✅'
  },
  FECHAMENTO: {
    id: 'FECHAMENTO',
    name: 'Fechamento',
    color: 'bg-green-100 border-green-200',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    icon: '💰'
  },
  DESISTENCIA: {
    id: 'DESISTENCIA',
    name: 'Desistência',
    color: 'bg-red-100 border-red-200',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    icon: '❌'
  }
}

// Helper to get stage order
export const PIPELINE_STAGE_ORDER: PipelineStage[] = [
  'LEAD',
  'CONTATO_INICIAL',
  'AGENDAMENTO', 
  'COMPARECIMENTO',
  'FECHAMENTO',
  'DESISTENCIA'
]