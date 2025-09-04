'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

import { PipelineBoard } from '@/features/pipeline/components/pipeline-board'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Phone, Mail, Calendar, User, MapPin } from 'lucide-react'

import { PipelineBoardData, PipelinePatient } from '@/features/pipeline/types/pipeline.types'

interface PipelinePageClientProps {
  initialBoardData: PipelineBoardData
}

export function PipelinePageClient({ initialBoardData }: PipelinePageClientProps) {
  const router = useRouter()
  const [selectedPatient, setSelectedPatient] = useState<PipelinePatient | null>(null)
  const [showPatientModal, setShowPatientModal] = useState(false)

  const handlePatientClick = (patient: PipelinePatient) => {
    setSelectedPatient(patient)
    setShowPatientModal(true)
  }

  const formatPhone = (phone: string) => {
    if (!phone) return ''
    return phone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3')
  }

  const formatDate = (date: string) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const getAge = (birthDate: string) => {
    if (!birthDate) return null
    return new Date().getFullYear() - new Date(birthDate).getFullYear()
  }

  return (
    <div className="space-y-6">
      {/* Pipeline Board */}
      <PipelineBoard
        initialData={initialBoardData}
        onPatientClick={handlePatientClick}
      />

      {/* Patient Details Modal */}
      <Dialog open={showPatientModal} onOpenChange={setShowPatientModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Detalhes do Paciente
            </DialogTitle>
          </DialogHeader>

          {selectedPatient && (
            <div className="space-y-4">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{selectedPatient.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    {selectedPatient.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{formatPhone(selectedPatient.phone)}</span>
                      </div>
                    )}
                    
                    {selectedPatient.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{selectedPatient.email}</span>
                      </div>
                    )}
                    
                    {selectedPatient.birth_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {formatDate(selectedPatient.birth_date)} 
                          {getAge(selectedPatient.birth_date) && ` (${getAge(selectedPatient.birth_date)} anos)`}
                        </span>
                      </div>
                    )}

                    {selectedPatient.city && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{selectedPatient.city}</span>
                      </div>
                    )}
                  </div>

                  {/* Pipeline Info */}
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status no Pipeline:</span>
                      <Badge variant="secondary">
                        {selectedPatient.pipeline_stage?.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-muted-foreground">Dias nesta etapa:</span>
                      <span className="text-sm font-medium">{selectedPatient.days_in_stage} dias</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={() => router.push(`/dashboard/clientes/${selectedPatient.id}`)}
                  className="flex-1"
                >
                  <User className="h-4 w-4 mr-2" />
                  Ver Perfil Completo
                </Button>
                
                {selectedPatient.phone && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const phone = selectedPatient.phone.replace(/\D/g, '')
                      window.open(`https://wa.me/55${phone}`, '_blank')
                    }}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}