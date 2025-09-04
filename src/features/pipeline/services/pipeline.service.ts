import { SupabaseClient } from '@supabase/supabase-js'
import { 
  PipelinePatient, 
  PipelineBoardData, 
  PipelineStage, 
  PipelineStageCount,
  PIPELINE_STAGE_ORDER 
} from '../types/pipeline.types'

export class PipelineService {
  /**
   * Get all patients grouped by pipeline stage
   */
  static async getPipelineBoardData(supabase: SupabaseClient): Promise<PipelineBoardData> {
    try {
      const { data: patients, error } = await supabase
        .from('patients')
        .select(`
          *,
          pipeline_stage,
          pipeline_entered_at
        `)
        .neq('status', 'archived')
        .order('pipeline_entered_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch pipeline data: ${error.message}`)
      }

      // Initialize board data with empty arrays for all stages
      const boardData: PipelineBoardData = {
        LEAD: [],
        CONTATO_INICIAL: [],
        AGENDAMENTO: [],
        COMPARECIMENTO: [],
        FECHAMENTO: [],
        DESISTENCIA: []
      }

      // Group patients by stage and calculate days in stage
      patients?.forEach((patient) => {
        const stage = (patient.pipeline_stage || 'LEAD') as PipelineStage
        const enteredAt = new Date(patient.pipeline_entered_at || patient.created_at)
        const now = new Date()
        const daysInStage = Math.floor((now.getTime() - enteredAt.getTime()) / (1000 * 60 * 60 * 24))

        const pipelinePatient: PipelinePatient = {
          ...patient,
          pipeline_stage: stage,
          pipeline_entered_at: patient.pipeline_entered_at || patient.created_at,
          days_in_stage: daysInStage
        }

        boardData[stage].push(pipelinePatient)
      })

      return boardData

    } catch (error) {
      console.error('Error fetching pipeline board data:', error)
      throw error
    }
  }

  /**
   * Get stage counts for metrics
   */
  static async getStagesCounts(supabase: SupabaseClient): Promise<PipelineStageCount[]> {
    try {
      const { data: counts, error } = await supabase
        .from('patients')
        .select('pipeline_stage')
        .neq('status', 'archived')

      if (error) {
        throw new Error(`Failed to fetch stage counts: ${error.message}`)
      }

      // Count patients by stage
      const stageCounts = PIPELINE_STAGE_ORDER.map(stage => ({
        stage,
        count: counts?.filter(p => (p.pipeline_stage || 'LEAD') === stage).length || 0
      }))

      return stageCounts

    } catch (error) {
      console.error('Error fetching stage counts:', error)
      throw error
    }
  }

  /**
   * Move patient to different stage
   */
  static async movePatient(
    patientId: string,
    newStage: PipelineStage,
    supabase: SupabaseClient,
    notes?: string
  ): Promise<PipelinePatient> {
    try {
      // Get current patient data
      const { data: currentPatient, error: fetchError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single()

      if (fetchError) {
        throw new Error(`Failed to fetch patient: ${fetchError.message}`)
      }

      const previousStage = currentPatient.pipeline_stage || 'LEAD'

      // Update patient pipeline stage
      const { data: updatedPatient, error: updateError } = await supabase
        .from('patients')
        .update({
          pipeline_stage: newStage,
          pipeline_entered_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', patientId)
        .select()
        .single()

      if (updateError) {
        throw new Error(`Failed to update patient stage: ${updateError.message}`)
      }

      // Record in pipeline history
      await supabase
        .from('pipeline_history')
        .insert({
          patient_id: patientId,
          clinic_id: currentPatient.clinic_id,
          stage: newStage,
          previous_stage: previousStage,
          entered_at: new Date().toISOString(),
          notes: notes || null
        })

      return {
        ...updatedPatient,
        pipeline_stage: newStage,
        pipeline_entered_at: updatedPatient.pipeline_entered_at,
        days_in_stage: 0
      } as PipelinePatient

    } catch (error) {
      console.error('Error moving patient:', error)
      throw error
    }
  }

  /**
   * Get patient pipeline history
   */
  static async getPatientHistory(patientId: string, supabase: SupabaseClient) {
    try {
      const { data: history, error } = await supabase
        .from('pipeline_history')
        .select(`
          *,
          profiles!changed_by(name)
        `)
        .eq('patient_id', patientId)
        .order('entered_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch patient history: ${error.message}`)
      }

      return history || []

    } catch (error) {
      console.error('Error fetching patient history:', error)
      throw error
    }
  }
}