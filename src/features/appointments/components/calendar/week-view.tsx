'use client'

import React from 'react'
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Clock } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'

import { Appointment, APPOINTMENT_STATUSES } from '../../types/appointment.types'

interface WeekViewProps {
  appointments: Appointment[]
  selectedDate: Date
  onAppointmentClick?: (appointment: Appointment) => void
  onTimeSlotClick?: (date: Date, time: string) => void
  workingHours?: {
    start: string
    end: string
  }
  className?: string
}

export function WeekView({
  appointments,
  selectedDate,
  onAppointmentClick,
  onTimeSlotClick,
  workingHours = { start: '08:00', end: '18:00' },
  className
}: WeekViewProps) {
  // Generate week days
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 }) // Sunday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Generate time slots (30-minute intervals)
  const timeSlots = generateTimeSlots(workingHours.start, workingHours.end, 30)

  // Group appointments by date and time
  const appointmentsByDateTime = appointments.reduce((acc, appointment) => {
    const dateKey = appointment.date
    const timeKey = appointment.start_time
    const key = `${dateKey}-${timeKey}`
    
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(appointment)
    
    return acc
  }, {} as Record<string, Appointment[]>)

  const getAppointmentsForSlot = (date: Date, time: string) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const key = `${dateStr}-${time}`
    return appointmentsByDateTime[key] || []
  }

  const handleSlotClick = (date: Date, time: string) => {
    const slotAppointments = getAppointmentsForSlot(date, time)
    
    if (slotAppointments.length > 0) {
      // If there are appointments, click on the first one
      onAppointmentClick?.(slotAppointments[0])
    } else {
      // If slot is empty, trigger new appointment
      onTimeSlotClick?.(date, time)
    }
  }

  return (
    <Card className={className}>
      <CardContent className="p-0">
        {/* Header with week days */}
        <div className="grid grid-cols-8 border-b sticky top-0 bg-background z-10">
          <div className="p-3 border-r text-sm font-medium text-center">
            Horário
          </div>
          {weekDays.map((day, index) => (
            <div
              key={index}
              className={`p-3 border-r text-center ${
                index === 6 ? 'border-r-0' : ''
              }`}
            >
              <div className="space-y-1">
                <div className={`text-xs font-medium ${
                  isToday(day) ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {format(day, 'EEE', { locale: ptBR })}
                </div>
                <div className={`text-lg font-semibold ${
                  isToday(day) 
                    ? 'text-primary bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center mx-auto' 
                    : ''
                }`}>
                  {format(day, 'd')}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Time slots grid */}
        <ScrollArea className="h-[calc(100vh-300px)]">
          <div className="divide-y">
            {timeSlots.map((time, timeIndex) => (
              <div key={time} className="grid grid-cols-8 h-[90px] overflow-hidden">
                {/* Time column */}
                <div className="p-3 border-r flex items-center justify-center">
                  <div className="text-xs text-muted-foreground font-medium text-center">
                    {time} - {getNextTimeSlot(time)}
                  </div>
                </div>

                {/* Day columns */}
                {weekDays.map((day, dayIndex) => {
                  const dayAppointments = getAppointmentsForSlot(day, time)
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6
                  
                  return (
                    <div
                      key={dayIndex}
                      className={`border-r relative ${
                        dayIndex === 6 ? 'border-r-0' : ''
                      } ${isWeekend ? 'bg-muted/20' : ''}`}
                    >
                      <Button
                        variant="ghost"
                        className="w-full h-full justify-start items-start p-0 rounded-none hover:bg-primary/5 absolute inset-0"
                        onClick={() => handleSlotClick(day, time)}
                      >
                        <div className="w-full space-y-1 p-1">
                          {dayAppointments.map((appointment, index) => (
                            <AppointmentCard
                              key={`${appointment.id}-${index}`}
                              appointment={appointment}
                              onClick={() => onAppointmentClick?.(appointment)}
                            />
                          ))}
                        </div>
                      </Button>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// Appointment card component for week view
function AppointmentCard({
  appointment,
  onClick
}: {
  appointment: Appointment
  onClick?: () => void
}) {
  const statusConfig = APPOINTMENT_STATUSES[appointment.status]
  
  return (
    <div
      className={`w-full p-2 rounded-md text-left cursor-pointer hover:opacity-80 transition-opacity ${statusConfig.color} overflow-hidden`}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
    >
      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex items-center gap-1 text-xs min-w-0">
          <Clock className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{appointment.start_time}</span>
        </div>
        <Badge
          variant="secondary"
          className="text-xs px-1.5 py-0.5 h-auto flex-shrink-0"
        >
          {statusConfig.label}
        </Badge>
      </div>
      
      <div className="font-medium text-sm truncate mb-0.5">
        {appointment.patient?.name}
      </div>
      
      {appointment.professional?.name && (
        <div className="text-xs opacity-75 truncate">
          Dr(a). {appointment.professional.name}
        </div>
      )}
    </div>
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

// Helper function to get next time slot
function getNextTimeSlot(time: string, intervalMinutes: number = 30): string {
  const [hours, minutes] = time.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + intervalMinutes
  const nextHours = Math.floor(totalMinutes / 60)
  const nextMinutes = totalMinutes % 60
  return `${nextHours.toString().padStart(2, '0')}:${nextMinutes.toString().padStart(2, '0')}`
}