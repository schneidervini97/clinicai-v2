'use client'

import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon, Clock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'

import { AvailabilityService } from '../../services/availability.service'
import { AvailabilitySlot } from '../../types/appointment.types'
import { createClient } from '@/lib/supabase/client'

interface DateTimePickerProps {
  value?: {
    date: Date
    time: string
  }
  onChange: (value: { date: Date; time: string }) => void
  professionalId?: string
  minDate?: Date
  maxDate?: Date
  duration?: number
  className?: string
  disabled?: boolean
}

export function DateTimePicker({
  value,
  onChange,
  professionalId,
  minDate = new Date(),
  maxDate,
  duration = 30,
  className,
  disabled = false
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(value?.date)
  const [selectedTime, setSelectedTime] = useState<string>(value?.time || '')
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  
  const supabase = createClient()

  // Update internal state when value changes
  useEffect(() => {
    if (value) {
      setSelectedDate(value.date)
      setSelectedTime(value.time)
    }
  }, [value])

  // Load available slots when date or professional changes
  useEffect(() => {
    if (selectedDate && professionalId) {
      loadAvailableSlots()
    } else {
      setAvailableSlots([])
    }
  }, [selectedDate, professionalId, duration])

  const loadAvailableSlots = async () => {
    if (!selectedDate || !professionalId) return

    setLoadingSlots(true)
    try {
      const slots = await AvailabilityService.getAvailableSlots(
        professionalId,
        selectedDate,
        duration,
        supabase
      )
      setAvailableSlots(slots)
      
      // If current selected time is not available, clear it
      if (selectedTime && !slots.find(slot => slot.time === selectedTime && slot.available)) {
        setSelectedTime('')
        onChange({ date: selectedDate, time: '' })
      }
    } catch (error) {
      console.error('Error loading available slots:', error)
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (!date || disabled) return
    
    setSelectedDate(date)
    setSelectedTime('') // Clear time when date changes
    setOpen(false)
    
    if (onChange) {
      onChange({ date, time: '' })
    }
  }

  const handleTimeSelect = (time: string) => {
    if (!selectedDate || disabled) return
    
    setSelectedTime(time)
    if (onChange) {
      onChange({ date: selectedDate, time })
    }
  }

  const handleManualTimeInput = (timeValue: string) => {
    if (!selectedDate || disabled) return
    
    // Validate time format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (timeRegex.test(timeValue)) {
      setSelectedTime(timeValue)
      if (onChange) {
        onChange({ date: selectedDate, time: timeValue })
      }
    }
  }

  // Group slots by period (morning/afternoon)
  const groupedSlots = availableSlots.reduce((groups, slot) => {
    const hour = parseInt(slot.time.split(':')[0])
    const period = hour < 12 ? 'Manhã' : 'Tarde'
    
    if (!groups[period]) {
      groups[period] = []
    }
    groups[period].push(slot)
    
    return groups
  }, {} as Record<string, AvailabilitySlot[]>)

  const formatDateDisplay = (date: Date | undefined) => {
    if (!date) return 'Selecione a data'
    return format(date, 'dd \'de\' MMMM \'de\' yyyy', { locale: ptBR })
  }

  const isDateDisabled = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (date < today) return true
    if (maxDate && date > maxDate) return true
    
    // Disable weekends if no professional selected (can be customized)
    // if (!professionalId && (date.getDay() === 0 || date.getDay() === 6)) return true
    
    return false
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Date Picker */}
      <div className="flex flex-col gap-3">
        <Label htmlFor="date-picker" className="text-sm font-medium">
          Data da Consulta
        </Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id="date-picker"
              className="w-full justify-start text-left font-normal"
              disabled={disabled}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatDateDisplay(selectedDate)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={isDateDisabled}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Time Selection */}
      {selectedDate && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Horário da Consulta
            </Label>
            {professionalId && (
              <Badge variant="outline" className="text-xs">
                {duration} min
              </Badge>
            )}
          </div>

          {/* Manual Time Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="time"
                value={selectedTime}
                onChange={(e) => handleManualTimeInput(e.target.value)}
                className="pl-10"
                disabled={disabled}
                step="900" // 15 minute intervals
              />
            </div>
          </div>

          {/* Available Slots (only show if professional is selected) */}
          {professionalId && (
            <div className="space-y-3">
              {loadingSlots ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              ) : availableSlots.length > 0 ? (
                <ScrollArea className="h-32 w-full">
                  <div className="space-y-3">
                    {Object.entries(groupedSlots).map(([period, slots]) => (
                      <div key={period} className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-medium">
                          {period}
                        </Label>
                        <div className="grid grid-cols-4 gap-2">
                          {slots.map((slot) => (
                            <Button
                              key={slot.time}
                              variant={selectedTime === slot.time ? "default" : "outline"}
                              size="sm"
                              className="text-xs"
                              onClick={() => handleTimeSelect(slot.time)}
                              disabled={!slot.available || disabled}
                            >
                              {slot.time}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : selectedDate && !loadingSlots ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Nenhum horário disponível para esta data
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {/* Quick Time Selection (when no professional selected) */}
          {!professionalId && !loadingSlots && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-medium">
                Horários Sugeridos
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'].map((time) => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? "default" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => handleTimeSelect(time)}
                    disabled={disabled}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}