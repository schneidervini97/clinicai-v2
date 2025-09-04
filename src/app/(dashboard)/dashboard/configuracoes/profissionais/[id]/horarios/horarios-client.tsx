'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, Plus, Trash2, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

import { ProfessionalService } from '@/features/appointments/services/professional.service'
import { createClient } from '@/lib/supabase/client'
import { Professional, ProfessionalSchedule } from '@/features/appointments/types/appointment.types'

interface ScheduleConfigPageClientProps {
  professional: Professional
  initialSchedules: ProfessionalSchedule[]
}

const WEEKDAYS: { value: number; label: string }[] = [
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
]

const TIME_OPTIONS = Array.from({ length: 21 }, (_, i) => {
  const hour = Math.floor(i / 2) + 7 // Start at 7 AM
  const minute = (i % 2) * 30
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
})

export function ScheduleConfigPageClient({ 
  professional, 
  initialSchedules 
}: ScheduleConfigPageClientProps) {
  const [schedules, setSchedules] = useState<ProfessionalSchedule[]>(initialSchedules)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const getScheduleForDay = (weekday: number) => {
    return schedules.find(s => s.weekday === weekday)
  }

  const handleCreateSchedule = async (weekday: number) => {
    try {
      setLoading(true)
      const newSchedule = await ProfessionalService.createSchedule({
        professional_id: professional.id,
        weekday,
        start_time: '08:00',
        end_time: '18:00',
        lunch_start: '12:00',
        lunch_end: '13:00',
        appointment_duration: 30,
        active: true
      }, supabase)

      setSchedules(prev => [...prev, newSchedule])
      toast.success('Horário criado com sucesso!')
    } catch (error) {
      console.error('Error creating schedule:', error)
      toast.error('Erro ao criar horário')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateSchedule = async (
    id: string, 
    field: 'start_time' | 'end_time' | 'lunch_start' | 'lunch_end' | 'appointment_duration' | 'active', 
    value: string | number | boolean
  ) => {
    try {
      setLoading(true)
      const updatedSchedule = await ProfessionalService.updateSchedule(id, {
        [field]: value
      }, supabase)

      setSchedules(prev => 
        prev.map(s => s.id === id ? updatedSchedule : s)
      )
      toast.success('Horário atualizado!')
    } catch (error) {
      console.error('Error updating schedule:', error)
      toast.error('Erro ao atualizar horário')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSchedule = async (id: string) => {
    try {
      setLoading(true)
      await ProfessionalService.deleteSchedule(id, supabase)
      
      setSchedules(prev => prev.filter(s => s.id !== id))
      toast.success('Horário removido com sucesso!')
    } catch (error) {
      console.error('Error deleting schedule:', error)
      toast.error('Erro ao remover horário')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/configuracoes/profissionais/${professional.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Configurar Horários
          </h1>
          <p className="text-muted-foreground">
            Configure os horários de atendimento de {professional.name}
          </p>
        </div>
      </div>

      {/* Schedule Configuration */}
      <div className="space-y-4">
        {WEEKDAYS.map((weekday) => {
          const schedule = getScheduleForDay(weekday.value)
          
          return (
            <Card key={weekday.value}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {weekday.label}
                  </CardTitle>
                  {!schedule ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCreateSchedule(weekday.value)}
                      disabled={loading}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Configurar Dia
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={schedule.active}
                        onCheckedChange={(checked) => 
                          handleUpdateSchedule(schedule.id, 'active', checked)
                        }
                        disabled={loading}
                      />
                      <Badge variant={schedule.active ? 'default' : 'secondary'}>
                        {schedule.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!schedule ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum horário configurado para este dia</p>
                    <p className="text-sm">Clique em &quot;Configurar Dia&quot; para definir o horário</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Horário de Funcionamento */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Horário de Funcionamento</h4>
                      <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-muted-foreground">Início:</label>
                          <Select
                            value={schedule.start_time ? schedule.start_time.substring(0, 5) : ''}
                            onValueChange={(value) => 
                              handleUpdateSchedule(schedule.id, 'start_time', value)
                            }
                            disabled={loading}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_OPTIONS.map(time => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-sm text-muted-foreground">Fim:</label>
                          <Select
                            value={schedule.end_time ? schedule.end_time.substring(0, 5) : ''}
                            onValueChange={(value) => 
                              handleUpdateSchedule(schedule.id, 'end_time', value)
                            }
                            disabled={loading}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_OPTIONS.map(time => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Horário de Almoço */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Horário de Almoço (opcional)</h4>
                      <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-muted-foreground">Início:</label>
                          <Select
                            value={schedule.lunch_start ? schedule.lunch_start.substring(0, 5) : 'none'}
                            onValueChange={(value) => 
                              handleUpdateSchedule(schedule.id, 'lunch_start', value === 'none' ? null : value)
                            }
                            disabled={loading}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue placeholder="--:--" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem almoço</SelectItem>
                              {TIME_OPTIONS.map(time => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-sm text-muted-foreground">Fim:</label>
                          <Select
                            value={schedule.lunch_end ? schedule.lunch_end.substring(0, 5) : 'none'}
                            onValueChange={(value) => 
                              handleUpdateSchedule(schedule.id, 'lunch_end', value === 'none' ? null : value)
                            }
                            disabled={loading}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue placeholder="--:--" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem almoço</SelectItem>
                              {TIME_OPTIONS.map(time => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Duração da Consulta */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Duração das Consultas</h4>
                      <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Select
                            value={schedule.appointment_duration?.toString() || '30'}
                            onValueChange={(value) => 
                              handleUpdateSchedule(schedule.id, 'appointment_duration', parseInt(value))
                            }
                            disabled={loading}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="15">15 minutos</SelectItem>
                              <SelectItem value="30">30 minutos</SelectItem>
                              <SelectItem value="45">45 minutos</SelectItem>
                              <SelectItem value="60">60 minutos</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex-1" />

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              disabled={loading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover horário</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover a configuração de horário para {weekday.label}? 
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteSchedule(schedule.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Resumo da Configuração
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {schedules.filter(s => s.active).length === 0 ? (
              <p className="text-muted-foreground">Nenhum dia configurado ainda.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {schedules
                  .filter(s => s.active)
                  .sort((a, b) => a.weekday - b.weekday)
                  .map(schedule => {
                    const weekday = WEEKDAYS.find(w => w.value === schedule.weekday)
                    return (
                      <div key={schedule.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="font-medium text-green-800">{weekday?.label}</div>
                        <div className="text-sm text-green-600">
                          {schedule.start_time?.substring(0, 5)} às {schedule.end_time?.substring(0, 5)}
                          {schedule.lunch_start && schedule.lunch_end && (
                            <span className="block">
                              Almoço: {schedule.lunch_start.substring(0, 5)} às {schedule.lunch_end.substring(0, 5)}
                            </span>
                          )}
                          <span className="block">
                            Consultas: {schedule.appointment_duration || 30} min
                          </span>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">Profissional:</span> {professional.name}
            </p>
            <p className="text-sm">
              <span className="font-medium">Total de períodos configurados:</span> {schedules.length}
            </p>
            <p className="text-sm">
              <span className="font-medium">Períodos ativos:</span> {schedules.filter(s => s.active).length}
            </p>
            <p className="text-sm">
              <span className="font-medium">Última atualização:</span> {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}