'use client'

import React from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  FileText, 
  Stethoscope,
  Edit3,
  Trash2,
  CheckCircle,
  XCircle,
  RotateCcw
} from 'lucide-react'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

import { Appointment, APPOINTMENT_STATUSES, APPOINTMENT_TYPES } from '../../types/appointment.types'

interface AppointmentDetailsSheetProps {
  appointment: Appointment | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (appointment: Appointment) => void
  onCancel?: (appointment: Appointment) => void
  onComplete?: (appointment: Appointment) => void
  onReschedule?: (appointment: Appointment) => void
  onDelete?: (appointment: Appointment) => void
}

export function AppointmentDetailsSheet({
  appointment,
  open,
  onOpenChange,
  onEdit,
  onCancel,
  onComplete,
  onReschedule,
  onDelete
}: AppointmentDetailsSheetProps) {
  if (!appointment) {
    return null
  }

  const statusConfig = APPOINTMENT_STATUSES[appointment.status]
  const typeConfig = APPOINTMENT_TYPES[appointment.type]

  const getPatientInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

  const formatDateTime = (date: string, startTime: string, endTime?: string) => {
    const appointmentDate = new Date(date)
    const dateStr = format(appointmentDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    const dayStr = format(appointmentDate, 'EEEE', { locale: ptBR })
    const timeStr = endTime ? `${startTime} - ${endTime}` : startTime
    
    return { dateStr, dayStr, timeStr }
  }

  const { dateStr, dayStr, timeStr } = formatDateTime(
    appointment.date, 
    appointment.start_time, 
    appointment.end_time
  )

  const canEdit = appointment.status !== 'completed' && appointment.status !== 'cancelled'
  const canCancel = appointment.status === 'scheduled'
  const canComplete = appointment.status === 'scheduled'
  const canReschedule = appointment.status === 'scheduled'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Detalhes da Consulta
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Status and Type */}
          <div className="flex items-center gap-2">
            <Badge className={statusConfig.color}>
              {statusConfig.label}
            </Badge>
            <Badge variant="outline">
              {typeConfig.label}
            </Badge>
          </div>

          {/* Date and Time */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Data e Horário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-lg font-medium">{dateStr}</div>
              <div className="text-sm text-muted-foreground capitalize">{dayStr}</div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-3 w-3" />
                <span>{timeStr}</span>
              </div>
            </CardContent>
          </Card>

          {/* Patient Information */}
          {appointment.patient && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Paciente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getPatientInitials(appointment.patient.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-2">
                    <div className="font-medium">{appointment.patient.name}</div>
                    
                    {appointment.patient.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{appointment.patient.phone}</span>
                      </div>
                    )}
                    
                    {appointment.patient.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span>{appointment.patient.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Professional Information */}
          {appointment.professional && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" />
                  Profissional
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="font-medium">{appointment.professional.name}</div>
                  
                  {appointment.professional.specialty && (
                    <div className="text-sm text-muted-foreground">
                      {appointment.professional.specialty}
                    </div>
                  )}
                  
                  {appointment.professional.registration_number && (
                    <Badge variant="outline" className="text-xs">
                      {appointment.professional.registration_number}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {appointment.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Observações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{appointment.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Internal Notes (if any) */}
          {appointment.internal_notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Observações Internas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {appointment.internal_notes}
                </p>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="space-y-2">
            {canEdit && onEdit && (
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => onEdit(appointment)}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Editar Consulta
              </Button>
            )}

            {canReschedule && onReschedule && (
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => onReschedule(appointment)}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reagendar
              </Button>
            )}

            {canComplete && onComplete && (
              <Button 
                variant="outline" 
                className="w-full justify-start text-green-600 hover:text-green-700"
                onClick={() => onComplete(appointment)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Marcar como Concluída
              </Button>
            )}

            {canCancel && onCancel && (
              <Button 
                variant="outline" 
                className="w-full justify-start text-orange-600 hover:text-orange-700"
                onClick={() => onCancel(appointment)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancelar Consulta
              </Button>
            )}

            {onDelete && (
              <Button 
                variant="outline" 
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={() => onDelete(appointment)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Consulta
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}