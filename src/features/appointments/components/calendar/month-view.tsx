'use client'

import React from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addDays, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Clock, User, Plus } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

import { Appointment, APPOINTMENT_STATUSES } from '../../types/appointment.types'

interface MonthViewProps {
  appointments: Appointment[]
  selectedDate: Date
  onAppointmentClick?: (appointment: Appointment) => void
  onDateClick?: (date: Date) => void
  className?: string
}

export function MonthView({
  appointments,
  selectedDate,
  onAppointmentClick,
  onDateClick,
  className
}: MonthViewProps) {
  // Get all days to display (including partial weeks)
  const monthStart = startOfMonth(selectedDate)
  const monthEnd = endOfMonth(selectedDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }) // Sunday
  const calendarEnd = addDays(startOfWeek(monthEnd, { weekStartsOn: 0 }), 41) // 6 weeks max

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  })

  // Group appointments by date
  const appointmentsByDate = appointments.reduce((acc, appointment) => {
    const dateKey = appointment.date
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(appointment)
    return acc
  }, {} as Record<string, Appointment[]>)

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return appointmentsByDate[dateStr] || []
  }

  const handleDayClick = (date: Date) => {
    const dayAppointments = getAppointmentsForDate(date)
    
    if (dayAppointments.length === 1) {
      // If only one appointment, click directly on it
      onAppointmentClick?.(dayAppointments[0])
    } else {
      // Otherwise, trigger date selection
      onDateClick?.(date)
    }
  }

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>
          {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Week headers */}
          <div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden">
            {weekDays.map((day) => (
              <div
                key={day}
                className="bg-muted p-2 text-center text-sm font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden">
            {calendarDays.map((date) => {
              const dayAppointments = getAppointmentsForDate(date)
              const isCurrentMonth = isSameMonth(date, selectedDate)
              const isDateToday = isToday(date)
              const hasAppointments = dayAppointments.length > 0

              return (
                <div
                  key={date.toISOString()}
                  className={`bg-background min-h-[120px] p-1 ${
                    !isCurrentMonth ? 'opacity-30' : ''
                  }`}
                >
                  <Button
                    variant="ghost"
                    className="w-full h-full justify-start items-start p-1 flex-col gap-1"
                    onClick={() => handleDayClick(date)}
                  >
                    {/* Date number */}
                    <div className="w-full flex justify-between items-start">
                      <span
                        className={`text-sm font-medium ${
                          isDateToday
                            ? 'bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center'
                            : isCurrentMonth
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {format(date, 'd')}
                      </span>
                      {!hasAppointments && isCurrentMonth && (
                        <Plus className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>

                    {/* Appointments */}
                    <div className="w-full space-y-1 flex-1">
                      {dayAppointments.slice(0, 3).map((appointment, index) => (
                        <AppointmentMonthCard
                          key={`${appointment.id}-${index}`}
                          appointment={appointment}
                          onClick={(e) => {
                            e.stopPropagation()
                            onAppointmentClick?.(appointment)
                          }}
                        />
                      ))}
                      
                      {dayAppointments.length > 3 && (
                        <div className="text-xs text-muted-foreground text-center py-1">
                          +{dayAppointments.length - 3} mais
                        </div>
                      )}
                    </div>
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Appointment card component for month view
function AppointmentMonthCard({
  appointment,
  onClick
}: {
  appointment: Appointment
  onClick?: (e: React.MouseEvent) => void
}) {
  const statusConfig = APPOINTMENT_STATUSES[appointment.status]

  return (
    <div
      className={`w-full p-1 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity ${statusConfig.color}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-1 truncate">
        <Clock className="h-2 w-2 flex-shrink-0" />
        <span className="truncate">
          {appointment.start_time} {appointment.patient?.name}
        </span>
      </div>
    </div>
  )
}