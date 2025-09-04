'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PipelinePatient, PipelineStageConfig } from '../types/pipeline.types'
import { PipelineCard } from './pipeline-card'

interface PipelineColumnProps {
  stage: PipelineStageConfig
  patients: PipelinePatient[]
  onPatientClick?: (patient: PipelinePatient) => void
  onDrop?: (patientId: string) => void
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: (e: React.DragEvent) => void
  isDragOver?: boolean
}

export function PipelineColumn({
  stage,
  patients,
  onPatientClick,
  onDrop,
  onDragOver,
  onDragLeave,
  isDragOver = false
}: PipelineColumnProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    onDragOver?.(e)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    onDragLeave?.(e)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const patientId = e.dataTransfer.getData('text/plain')
    if (patientId && onDrop) {
      onDrop(patientId)
    }
  }

  return (
    <Card 
      className={`flex-1 min-w-[280px] max-w-[320px] transition-all duration-200 overflow-hidden ${
        isDragOver ? 'ring-2 ring-primary ring-offset-2 bg-primary/5' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CardHeader className={`p-3 ${stage.bgColor} border-b rounded-t-lg`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{stage.icon}</span>
            <h3 className={`font-semibold text-sm ${stage.textColor}`}>
              {stage.name}
            </h3>
          </div>
          <Badge 
            variant="secondary" 
            className={`${stage.color} font-medium`}
          >
            {patients.length}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-300px)]">
          <div className="p-3">
            {patients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="text-2xl mb-2 opacity-50">{stage.icon}</div>
                <p className="text-sm">Nenhum paciente nesta etapa</p>
              </div>
            ) : (
              <div className="space-y-2">
                {patients.map((patient) => (
                  <div
                    key={patient.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', patient.id)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragEnd={(e) => {
                      // Reset any drag states if needed
                    }}
                  >
                    <PipelineCard
                      patient={patient}
                      onClick={() => onPatientClick?.(patient)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}