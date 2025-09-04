'use client'

import React, { useState } from 'react'
import { format, addDays, addWeeks, addMonths, startOfDay, startOfWeek, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, Plus } from 'lucide-react'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { DayView, WeekView, MonthView } from './calendar'
import { Appointment } from '../types/appointment.types'

type CalendarView = 'day' | 'week' | 'month'

interface AppointmentCalendarProps {
  appointments: Appointment[]
  onAppointmentClick?: (appointment: Appointment) => void
  onTimeSlotClick?: (date: Date, time: string) => void
  onDateClick?: (date: Date) => void
  onNewAppointment?: () => void
  workingHours?: {
    start: string
    end: string
  }
  className?: string
}

export function AppointmentCalendar({
  appointments,
  onAppointmentClick,
  onTimeSlotClick,
  onDateClick,
  onNewAppointment,
  workingHours = { start: '08:00', end: '18:00' },
  className
}: AppointmentCalendarProps) {
  const [currentView, setCurrentView] = useState<CalendarView>('week')
  const [selectedDate, setSelectedDate] = useState(new Date())

  const navigatePrevious = () => {
    setSelectedDate(prev => {
      switch (currentView) {
        case 'day':
          return addDays(prev, -1)
        case 'week':
          return addWeeks(prev, -1)
        case 'month':
          return addMonths(prev, -1)
        default:
          return prev
      }
    })
  }

  const navigateNext = () => {
    setSelectedDate(prev => {
      switch (currentView) {
        case 'day':
          return addDays(prev, 1)
        case 'week':
          return addWeeks(prev, 1)
        case 'month':
          return addMonths(prev, 1)
        default:
          return prev
      }
    })
  }

  const navigateToday = () => {
    setSelectedDate(new Date())
  }

  const getViewTitle = () => {
    switch (currentView) {
      case 'day':
        return format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
      case 'week':
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 })
        const weekEnd = addDays(weekStart, 6)
        return `${format(weekStart, 'dd/MM', { locale: ptBR })} - ${format(weekEnd, 'dd/MM/yyyy', { locale: ptBR })}`
      case 'month':
        return format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })
      default:
        return ''
    }
  }

  const handleDateClick = (date: Date) => {
    if (currentView === 'month') {
      // Switch to day view when clicking on a month date
      setSelectedDate(startOfDay(date))
      setCurrentView('day')
    }
    onDateClick?.(date)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={navigatePrevious}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  onClick={navigateToday}
                  className="min-w-[100px]"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Hoje
                </Button>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={navigateNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-xl font-semibold">
                {getViewTitle()}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onNewAppointment && (
                <Button onClick={onNewAppointment}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Consulta
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar Views */}
      <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as CalendarView)}>
        <div className="flex justify-center">
          <TabsList>
            <TabsTrigger value="day">Dia</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="month">Mês</TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-4">
          <TabsContent value="day" className="mt-0">
            <DayView
              appointments={appointments}
              selectedDate={selectedDate}
              onAppointmentClick={onAppointmentClick}
              onTimeSlotClick={onTimeSlotClick}
              workingHours={workingHours}
            />
          </TabsContent>

          <TabsContent value="week" className="mt-0">
            <WeekView
              appointments={appointments}
              selectedDate={selectedDate}
              onAppointmentClick={onAppointmentClick}
              onTimeSlotClick={onTimeSlotClick}
              workingHours={workingHours}
            />
          </TabsContent>

          <TabsContent value="month" className="mt-0">
            <MonthView
              appointments={appointments}
              selectedDate={selectedDate}
              onAppointmentClick={onAppointmentClick}
              onDateClick={handleDateClick}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}