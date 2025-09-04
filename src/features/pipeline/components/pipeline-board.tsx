'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { 
  PipelineBoardData, 
  PipelinePatient, 
  PipelineStage,
  PIPELINE_STAGES,
  PIPELINE_STAGE_ORDER 
} from '../types/pipeline.types'
import { PipelineColumn } from './pipeline-column'
import { PipelineService } from '../services/pipeline.service'
import { createClient } from '@/lib/supabase/client'

interface PipelineBoardProps {
  initialData: PipelineBoardData
  onPatientClick?: (patient: PipelinePatient) => void
}

export function PipelineBoard({ initialData, onPatientClick }: PipelineBoardProps) {
  const [boardData, setBoardData] = useState<PipelineBoardData>(initialData)
  const [dragOverStage, setDragOverStage] = useState<PipelineStage | null>(null)
  const [isMoving, setIsMoving] = useState(false)
  const supabase = createClient()

  const handlePatientMove = async (patientId: string, newStage: PipelineStage) => {
    if (isMoving) return

    try {
      setIsMoving(true)

      // Find current patient and stage
      let currentPatient: PipelinePatient | null = null
      let currentStage: PipelineStage | null = null

      for (const stage of PIPELINE_STAGE_ORDER) {
        const patient = boardData[stage].find(p => p.id === patientId)
        if (patient) {
          currentPatient = patient
          currentStage = stage
          break
        }
      }

      if (!currentPatient || !currentStage || currentStage === newStage) {
        return
      }

      // Optimistically update UI
      setBoardData(prev => ({
        ...prev,
        [currentStage]: prev[currentStage].filter(p => p.id !== patientId),
        [newStage]: [
          ...prev[newStage],
          { ...currentPatient, pipeline_stage: newStage, days_in_stage: 0 }
        ]
      }))

      // Update in database
      await PipelineService.movePatient(patientId, newStage, supabase)

      toast.success(
        `${currentPatient.name} movido para ${PIPELINE_STAGES[newStage].name}`
      )

    } catch (error) {
      console.error('Error moving patient:', error)
      
      // Revert optimistic update on error
      setBoardData(initialData)
      
      toast.error('Erro ao mover paciente. Tente novamente.')
    } finally {
      setIsMoving(false)
      setDragOverStage(null)
    }
  }

  const handleDragOver = (stage: PipelineStage) => {
    setDragOverStage(stage)
  }

  const handleDragLeave = () => {
    setDragOverStage(null)
  }

  const getTotalPatients = () => {
    return PIPELINE_STAGE_ORDER.reduce((total, stage) => {
      return total + boardData[stage].length
    }, 0)
  }

  return (
    <div className="space-y-4">
      {/* Header with total count */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pipeline de Vendas</h2>
          <p className="text-muted-foreground">
            Total: {getTotalPatients()} pacientes no funil
          </p>
        </div>
      </div>

      {/* Pipeline Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGE_ORDER.map((stageId) => (
          <PipelineColumn
            key={stageId}
            stage={PIPELINE_STAGES[stageId]}
            patients={boardData[stageId]}
            onPatientClick={onPatientClick}
            onDrop={(patientId) => handlePatientMove(patientId, stageId)}
            onDragOver={() => handleDragOver(stageId)}
            onDragLeave={handleDragLeave}
            isDragOver={dragOverStage === stageId}
          />
        ))}
      </div>

      {/* Loading overlay when moving patients */}
      {isMoving && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="text-sm">Movendo paciente...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}