'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarPlus, Loader2, User, Stethoscope } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

import { DateTimePicker } from '../forms/date-time-picker'
import { appointmentSchema, AppointmentFormData } from '../../types/appointment.schema'
import { Professional, APPOINTMENT_TYPES } from '../../types/appointment.types'
import { Patient } from '@/features/patients/types/patient.types'

interface AppointmentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  professionals: Professional[]
  patients: Patient[]
  onSubmit: (data: AppointmentFormData) => Promise<void>
  onCreatePatient?: () => void
  defaultValues?: Partial<AppointmentFormData>
  mode?: 'create' | 'edit'
  title?: string
}

export function AppointmentFormDialog({
  open,
  onOpenChange,
  professionals,
  patients,
  onSubmit,
  onCreatePatient,
  defaultValues,
  mode = 'create',
  title
}: AppointmentFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      type: 'consultation',
      ...defaultValues,
    },
  })

  const selectedProfessional = form.watch('professional_id')
  const selectedDate = form.watch('date')
  const selectedTime = form.watch('start_time')

  const handleSubmit = async (data: AppointmentFormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      form.reset()
      onOpenChange(false)
    } catch (error) {
      console.error('Error submitting appointment:', error)
      // Error handling is done in parent component
    } finally {
      setIsSubmitting(false)
    }
  }

  const getProfessionalInfo = (professionalId: string) => {
    return professionals.find(p => p.id === professionalId)
  }

  const getPatientInfo = (patientId: string) => {
    return patients.find(p => p.id === patientId)
  }

  const selectedProfessionalInfo = selectedProfessional 
    ? getProfessionalInfo(selectedProfessional)
    : null

  const getDialogTitle = () => {
    if (title) return title
    return mode === 'create' ? 'Novo Agendamento' : 'Editar Agendamento'
  }

  const getSubmitButtonText = () => {
    if (isSubmitting) return mode === 'create' ? 'Agendando...' : 'Salvando...'
    return mode === 'create' ? 'Agendar Consulta' : 'Salvar Alterações'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" />
            {getDialogTitle()}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Patient Selection */}
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="patient_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Paciente
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o paciente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {patients && patients.length > 0 ? patients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.name}
                          </SelectItem>
                        )) : (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
                            Nenhum paciente cadastrado
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Create New Patient Button */}
              {onCreatePatient && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={onCreatePatient}
                >
                  <User className="h-4 w-4 mr-2" />
                  Cadastrar Novo Paciente
                </Button>
              )}
            </div>

            {/* Professional Selection */}
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="professional_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4" />
                      Profissional
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o profissional" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {professionals && professionals.length > 0 ? professionals.map((professional) => (
                          <SelectItem key={professional.id} value={professional.id}>
                            {professional.name}{professional.specialty ? ` - ${professional.specialty}` : ''}
                          </SelectItem>
                        )) : (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
                            Nenhum profissional cadastrado
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Professional Info Card */}
            {selectedProfessionalInfo && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Stethoscope className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{selectedProfessionalInfo.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {selectedProfessionalInfo.specialty && (
                          <Badge variant="secondary" className="text-xs">
                            {selectedProfessionalInfo.specialty}
                          </Badge>
                        )}
                        {selectedProfessionalInfo.registration_number && (
                          <Badge variant="outline" className="text-xs">
                            {selectedProfessionalInfo.registration_number}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Separator />

            {/* Date and Time Selection */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <DateTimePicker
                      value={
                        field.value && selectedTime
                          ? { date: field.value, time: selectedTime }
                          : undefined
                      }
                      onChange={(value) => {
                        field.onChange(value.date)
                        form.setValue('start_time', value.time)
                      }}
                      professionalId={selectedProfessional}
                      minDate={new Date()}
                      duration={30}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Appointment Type */}
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Consulta</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(APPOINTMENT_TYPES).map(([value, { label }]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observações sobre a consulta (visível para o paciente)..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Estas observações serão visíveis para o paciente
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Internal Notes */}
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="internal_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações Internas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observações internas (não visível para o paciente)..."
                        className="min-h-[60px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Estas observações são apenas para uso interno da clínica
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {getSubmitButtonText()}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}