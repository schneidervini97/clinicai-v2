'use client'

import React from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Clock, User, Phone, FileText, MoreVertical } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'

import { Appointment, APPOINTMENT_STATUSES, APPOINTMENT_TYPES } from '../../types/appointment.types'

interface DayViewProps {
  appointments: Appointment[]
  selectedDate: Date
  onAppointmentClick?: (appointment: Appointment) => void
  onTimeSlotClick?: (date: Date, time: string) => void
  onAppointmentEdit?: (appointment: Appointment) => void
  onAppointmentCancel?: (appointment: Appointment) => void
  onAppointmentComplete?: (appointment: Appointment) => void
  workingHours?: {
    start: string
    end: string
  }
  className?: string
}

export function DayView({
  appointments,
  selectedDate,
  onAppointmentClick,
  onTimeSlotClick,
  onAppointmentEdit,
  onAppointmentCancel,
  onAppointmentComplete,
  workingHours = { start: '08:00', end: '18:00' },
  className
}: DayViewProps) {
  // Filter appointments for selected date
  const dayAppointments = appointments.filter(apt => 
    apt.date === format(selectedDate, 'yyyy-MM-dd')
  ).sort((a, b) => a.start_time.localeCompare(b.start_time))

  // Generate time slots
  const timeSlots = generateTimeSlots(workingHours.start, workingHours.end, 30)

  // Group appointments by time
  const appointmentsByTime = dayAppointments.reduce((acc, appointment) => {
    const timeKey = appointment.start_time
    if (!acc[timeKey]) {
      acc[timeKey] = []
    }
    acc[timeKey].push(appointment)
    return acc
  }, {} as Record<string, Appointment[]>)

  const getAppointmentsForTime = (time: string) => {
    return appointmentsByTime[time] || []
  }

  const handleSlotClick = (time: string) => {
    const slotAppointments = getAppointmentsForTime(time)
    
    if (slotAppointments.length > 0) {
      onAppointmentClick?.(slotAppointments[0])
    } else {
      onTimeSlotClick?.(selectedDate, time)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Day Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">
                {format(selectedDate, 'dd \'de\' MMMM', { locale: ptBR })}
              </div>
              <div className="text-sm text-muted-foreground">
                {format(selectedDate, 'EEEE', { locale: ptBR })}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold">
                {dayAppointments.length} consultas
              </div>
              <div className="text-sm text-muted-foreground">
                {dayAppointments.filter(apt => apt.status === 'completed').length} concluídas
              </div>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Timeline */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="p-4 space-y-2">
              {timeSlots.map((time) => {
                const slotAppointments = getAppointmentsForTime(time)
                const hasAppointments = slotAppointments.length > 0
                
                return (
                  <div key={time} className="flex gap-4">
                    {/* Time column */}
                    <div className="w-20 flex-shrink-0 text-right">
                      <div className="text-sm font-medium text-muted-foreground sticky top-4">
                        {time}
                      </div>
                    </div>

                    {/* Content column */}
                    <div className="flex-1 min-h-[60px] relative">
                      {/* Time line */}
                      <div className="absolute left-0 top-0 w-px h-full bg-border" />
                      <div className="absolute left-0 top-6 w-2 h-px bg-border" />
                      
                      {hasAppointments ? (
                        <div className="space-y-2">
                          {slotAppointments.map((appointment) => (
                            <AppointmentTimelineCard
                              key={appointment.id}
                              appointment={appointment}
                              onClick={() => onAppointmentClick?.(appointment)}
                              onEdit={() => onAppointmentEdit?.(appointment)}
                              onCancel={() => onAppointmentCancel?.(appointment)}
                              onComplete={() => onAppointmentComplete?.(appointment)}
                            />
                          ))}
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          className="w-full h-14 justify-start text-muted-foreground hover:text-foreground hover:border-dashed hover:border-2 hover:border-primary/50"
                          onClick={() => handleSlotClick(time)}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full border-2 border-dashed border-current" />
                            <span className="text-sm">Clique para agendar</span>
                          </div>
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

// Appointment timeline card component
function AppointmentTimelineCard({
  appointment,
  onClick,
  onEdit,
  onCancel,
  onComplete
}: {
  appointment: Appointment
  onClick?: () => void
  onEdit?: () => void
  onCancel?: () => void
  onComplete?: () => void
}) {
  const statusConfig = APPOINTMENT_STATUSES[appointment.status]
  const typeConfig = APPOINTMENT_TYPES[appointment.type]
  
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2" onClick={onClick}>
            {/* Patient and Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="font-semibold">{appointment.patient?.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {appointment.start_time} - {appointment.end_time}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge className={statusConfig.color}>
                  {statusConfig.label}
                </Badge>
                <Badge variant="outline">
                  {typeConfig.label}
                </Badge>
              </div>
            </div>

            {/* Professional */}
            {appointment.professional?.name && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{appointment.professional.name}</span>
                {appointment.professional.specialty && (
                  <>
                    <span>•</span>
                    <span>{appointment.professional.specialty}</span>
                  </>
                )}
              </div>
            )}

            {/* Contact Info */}
            {appointment.patient?.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{appointment.patient.phone}</span>
              </div>
            )}

            {/* Notes */}
            {appointment.notes && (
              <div className="flex items-start gap-2 text-sm">
                <FileText className="h-3 w-3 mt-0.5 text-muted-foreground" />
                <span className="text-muted-foreground line-clamp-2">
                  {appointment.notes}
                </span>
              </div>
            )}
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onClick}>
                Ver detalhes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {appointment.status === 'scheduled' && (
                <DropdownMenuItem onClick={onComplete}>
                  Marcar como concluído
                </DropdownMenuItem>
              )}
              {appointment.status !== 'cancelled' && (
                <DropdownMenuItem 
                  onClick={onCancel}
                  className="text-destructive"
                >
                  Cancelar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}

// Helper function to generate time slots
function generateTimeSlots(
  startTime: string,
  endTime: string,
  intervalMinutes: number = 30
): string[] {
  const slots: string[] = []
  
  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)
  
  const startTimeInMinutes = startHour * 60 + startMinute
  const endTimeInMinutes = endHour * 60 + endMinute
  
  for (let time = startTimeInMinutes; time < endTimeInMinutes; time += intervalMinutes) {
    const hours = Math.floor(time / 60)
    const minutes = time % 60
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    slots.push(timeString)
  }
  
  return slots
}