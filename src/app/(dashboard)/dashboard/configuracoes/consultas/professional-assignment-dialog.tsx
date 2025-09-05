'use client'

import React, { useState, useEffect } from 'react'
import { Users, Check, X, Clock, DollarSign, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { ConsultationTypeService } from '@/features/appointments/services/consultation-type.service'
import { createClient } from '@/lib/supabase/client'
import { ConsultationType, formatPrice, formatDuration } from '@/features/appointments/types/consultation-types'
import { Professional } from '@/features/appointments/types/appointment.types'

interface ProfessionalAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  consultationType: ConsultationType
  professionals: Professional[]
}

interface ProfessionalWithAssignment extends Professional {
  is_assigned: boolean
  custom_duration?: number
  custom_price?: number
}

export function ProfessionalAssignmentDialog({
  open,
  onOpenChange,
  consultationType,
  professionals
}: ProfessionalAssignmentDialogProps) {
  const [professionalData, setProfessionalData] = useState<ProfessionalWithAssignment[]>([])
  const [loading, setLoading] = useState(false)
  const [editingProfessional, setEditingProfessional] = useState<string | null>(null)
  const [customValues, setCustomValues] = useState<{[key: string]: {duration?: number, price?: number}}>({})
  
  const supabase = createClient()

  useEffect(() => {
    if (open && consultationType) {
      loadProfessionalAssignments()
    }
  }, [open, consultationType])

  const loadProfessionalAssignments = async () => {
    try {
      setLoading(true)
      const data = await ConsultationTypeService.getAllWithProfessionalStatus(
        consultationType.id,
        supabase
      )
      
      // Map to our interface
      const mappedData = professionals.map(prof => {
        const assignment = data.find(d => d.id === consultationType.id) // This logic might need adjustment
        return {
          ...prof,
          is_assigned: assignment?.is_assigned || false,
          custom_duration: assignment?.custom_duration,
          custom_price: assignment?.custom_price
        }
      })

      setProfessionalData(mappedData)
    } catch (error) {
      console.error('Error loading professional assignments:', error)
      toast.error('Erro ao carregar vinculações')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleAssignment = async (professionalId: string, isAssigned: boolean) => {
    try {
      setLoading(true)
      
      if (isAssigned) {
        // Add assignment
        await ConsultationTypeService.addToProfessional({
          professional_id: professionalId,
          consultation_type_id: consultationType.id,
          available: true
        }, supabase)
      } else {
        // Remove assignment
        await ConsultationTypeService.removeFromProfessional(
          professionalId,
          consultationType.id,
          supabase
        )
      }

      // Update local state
      setProfessionalData(prev => 
        prev.map(prof => 
          prof.id === professionalId 
            ? { ...prof, is_assigned: isAssigned, custom_duration: undefined, custom_price: undefined }
            : prof
        )
      )

      toast.success(isAssigned ? 'Profissional vinculado!' : 'Profissional desvinculado!')
    } catch (error) {
      console.error('Error toggling professional assignment:', error)
      toast.error('Erro ao alterar vinculação')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCustomValues = async (professionalId: string) => {
    try {
      setLoading(true)
      const values = customValues[professionalId] || {}
      
      await ConsultationTypeService.updateProfessionalConsultationType(
        professionalId,
        consultationType.id,
        {
          custom_duration: values.duration,
          custom_price: values.price,
        },
        supabase
      )

      // Update local state
      setProfessionalData(prev => 
        prev.map(prof => 
          prof.id === professionalId 
            ? { 
                ...prof, 
                custom_duration: values.duration,
                custom_price: values.price
              }
            : prof
        )
      )

      setEditingProfessional(null)
      setCustomValues(prev => ({ ...prev, [professionalId]: {} }))
      toast.success('Configurações salvas!')
    } catch (error) {
      console.error('Error saving custom values:', error)
      toast.error('Erro ao salvar configurações')
    } finally {
      setLoading(false)
    }
  }

  const getCustomDurationValue = (professionalId: string) => {
    const prof = professionalData.find(p => p.id === professionalId)
    return customValues[professionalId]?.duration ?? prof?.custom_duration ?? consultationType.duration
  }

  const getCustomPriceValue = (professionalId: string) => {
    const prof = professionalData.find(p => p.id === professionalId)
    return customValues[professionalId]?.price ?? prof?.custom_price ?? consultationType.price
  }

  const assignedCount = professionalData.filter(p => p.is_assigned).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Vincular Profissionais - {consultationType.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: consultationType.color }}
                  />
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo</p>
                    <p className="font-medium">{consultationType.name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Duração Padrão</p>
                    <p className="font-medium">{formatDuration(consultationType.duration)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Profissionais</p>
                    <p className="font-medium">{assignedCount} de {professionals.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Professional List */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Profissionais Disponíveis</h3>
            
            {professionalData.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum profissional cadastrado</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {professionalData.map((professional) => (
                  <Card key={professional.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleToggleAssignment(professional.id, !professional.is_assigned)}
                              disabled={loading}
                              className={`
                                w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                                ${professional.is_assigned
                                  ? 'bg-green-600 border-green-600 text-white'
                                  : 'border-gray-300 hover:border-gray-400'
                                }
                              `}
                            >
                              {professional.is_assigned && <Check className="h-4 w-4" />}
                            </button>
                            
                            <div>
                              <p className="font-medium">{professional.name}</p>
                              {professional.specialty && (
                                <p className="text-sm text-muted-foreground">{professional.specialty}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {professional.is_assigned && (
                          <div className="flex items-center gap-4">
                            {editingProfessional === professional.id ? (
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2">
                                  <Label className="text-sm">Duração:</Label>
                                  <Select
                                    value={getCustomDurationValue(professional.id)?.toString() || ''}
                                    onValueChange={(value) => setCustomValues(prev => ({
                                      ...prev,
                                      [professional.id]: {
                                        ...prev[professional.id],
                                        duration: value ? parseInt(value) : undefined
                                      }
                                    }))}
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue placeholder="Padrão" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="15">15 min</SelectItem>
                                      <SelectItem value="30">30 min</SelectItem>
                                      <SelectItem value="45">45 min</SelectItem>
                                      <SelectItem value="60">60 min</SelectItem>
                                      <SelectItem value="90">90 min</SelectItem>
                                      <SelectItem value="120">120 min</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Label className="text-sm">Preço:</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="w-24"
                                    placeholder="0,00"
                                    value={getCustomPriceValue(professional.id) || ''}
                                    onChange={(e) => setCustomValues(prev => ({
                                      ...prev,
                                      [professional.id]: {
                                        ...prev[professional.id],
                                        price: e.target.value ? parseFloat(e.target.value) : undefined
                                      }
                                    }))}
                                  />
                                </div>

                                <Button
                                  size="sm"
                                  onClick={() => handleSaveCustomValues(professional.id)}
                                  disabled={loading}
                                >
                                  Salvar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingProfessional(null)
                                    setCustomValues(prev => ({ ...prev, [professional.id]: {} }))
                                  }}
                                  disabled={loading}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-4">
                                <div className="text-right text-sm">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>
                                      {formatDuration(professional.custom_duration || consultationType.duration)}
                                      {professional.custom_duration && ' (personalizado)'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    <span>
                                      {formatPrice(professional.custom_price || consultationType.price)}
                                      {professional.custom_price && ' (personalizado)'}
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingProfessional(professional.id)}
                                  disabled={loading}
                                >
                                  Personalizar
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Concluído
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}