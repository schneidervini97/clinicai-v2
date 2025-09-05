'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { AppointmentCalendar } from '@/features/appointments/components/appointment-calendar'
import { AppointmentFormDialog } from '@/features/appointments/components/dialogs/appointment-form-dialog'
import { AppointmentDetailsSheet } from '@/features/appointments/components/dialogs/appointment-details-sheet'
import { AppointmentService } from '@/features/appointments/services/appointment.service'
import { createClient } from '@/lib/supabase/client'

import { Appointment, Professional } from '@/features/appointments/types/appointment.types'
import { AppointmentFormData } from '@/features/appointments/types/appointment.schema'
import { Patient } from '@/features/patients/types/patient.types'
import { ConsultationType } from '@/features/appointments/types/consultation-types'

interface AgendaPageClientProps {
  initialAppointments: Appointment[]
  professionals: Professional[]
  patients: Patient[]
  consultationTypes: ConsultationType[]
}

export function AgendaPageClient({ 
  initialAppointments, 
  professionals,
  patients,
  consultationTypes
}: AgendaPageClientProps) {
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [showAppointmentForm, setShowAppointmentForm] = useState(false)
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false)
  const [appointmentFormData, setAppointmentFormData] = useState<Partial<AppointmentFormData>>({})
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')

  const supabase = createClient()

  // Debug logs
  console.log('AgendaPageClient - Professionals received:', professionals)
  console.log('AgendaPageClient - Initial appointments:', initialAppointments.length)

  // Handler for creating new appointment
  const handleNewAppointment = useCallback(() => {
    setAppointmentFormData({})
    setFormMode('create')
    setShowAppointmentForm(true)
  }, [])

  // Handler for time slot click (create appointment at specific time)
  const handleTimeSlotClick = useCallback((date: Date, time: string) => {
    const dateStr = date.toISOString().split('T')[0]
    setAppointmentFormData({
      date: dateStr,
      start_time: time
    })
    setFormMode('create')
    setShowAppointmentForm(true)
  }, [])

  // Handler for appointment click (show details)
  const handleAppointmentClick = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setShowAppointmentDetails(true)
  }, [])

  // Handler for editing appointment
  const handleEditAppointment = useCallback((appointment: Appointment) => {
    setAppointmentFormData({
      patient_id: appointment.patient?.id || '',
      professional_id: appointment.professional?.id || '',
      date: appointment.date,
      start_time: appointment.start_time,
      type: appointment.type,
      notes: appointment.notes || '',
      internal_notes: appointment.internal_notes || ''
    })
    setSelectedAppointment(appointment)
    setFormMode('edit')
    setShowAppointmentDetails(false)
    setShowAppointmentForm(true)
  }, [])

  // Handler for appointment form submission
  const handleAppointmentSubmit = useCallback(async (data: AppointmentFormData) => {
    try {
      let appointment: Appointment

      if (formMode === 'create') {
        appointment = await AppointmentService.create(data, supabase)
        setAppointments(prev => [...prev, appointment])
        toast.success('Consulta agendada com sucesso!')
      } else {
        if (!selectedAppointment) throw new Error('No appointment selected for edit')
        
        appointment = await AppointmentService.update(selectedAppointment.id, data, supabase)
        setAppointments(prev => 
          prev.map(apt => apt.id === appointment.id ? appointment : apt)
        )
        toast.success('Consulta atualizada com sucesso!')
      }
    } catch (error) {
      console.error('Error submitting appointment:', error)
      toast.error(
        error instanceof Error 
          ? error.message 
          : 'Erro ao salvar consulta'
      )
      throw error // Re-throw to prevent dialog from closing
    }
  }, [formMode, selectedAppointment, supabase])

  // Handler for completing appointment
  const handleCompleteAppointment = useCallback(async (appointment: Appointment) => {
    try {
      const updatedAppointment = await AppointmentService.updateStatus(
        appointment.id, 
        'completed', 
        supabase
      )
      
      setAppointments(prev =>
        prev.map(apt => apt.id === appointment.id ? updatedAppointment : apt)
      )
      
      toast.success('Consulta marcada como concluída!')
      setShowAppointmentDetails(false)
    } catch (error) {
      console.error('Error completing appointment:', error)
      toast.error('Erro ao marcar consulta como concluída')
    }
  }, [supabase])

  // Handler for canceling appointment
  const handleCancelAppointment = useCallback(async (appointment: Appointment) => {
    try {
      const updatedAppointment = await AppointmentService.updateStatus(
        appointment.id, 
        'cancelled', 
        supabase
      )
      
      setAppointments(prev =>
        prev.map(apt => apt.id === appointment.id ? updatedAppointment : apt)
      )
      
      toast.success('Consulta cancelada!')
      setShowAppointmentDetails(false)
    } catch (error) {
      console.error('Error canceling appointment:', error)
      toast.error('Erro ao cancelar consulta')
    }
  }, [supabase])

  // Handler for rescheduling appointment
  const handleRescheduleAppointment = useCallback((appointment: Appointment) => {
    // For rescheduling, we'll edit the appointment
    handleEditAppointment(appointment)
  }, [handleEditAppointment])

  // Handler for deleting appointment
  const handleDeleteAppointment = useCallback(async (appointment: Appointment) => {
    if (!confirm('Tem certeza que deseja excluir esta consulta? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      await AppointmentService.delete(appointment.id, supabase)
      
      setAppointments(prev =>
        prev.filter(apt => apt.id !== appointment.id)
      )
      
      toast.success('Consulta excluída!')
      setShowAppointmentDetails(false)
    } catch (error) {
      console.error('Error deleting appointment:', error)
      toast.error('Erro ao excluir consulta')
    }
  }, [supabase])

  // Handler for creating new patient (redirect to patient creation)
  const handleCreatePatient = useCallback(() => {
    router.push('/dashboard/clientes/novo')
  }, [router])

  return (
    <div className="space-y-6">
      {/* Main Calendar */}
      <AppointmentCalendar
        appointments={appointments}
        onAppointmentClick={handleAppointmentClick}
        onTimeSlotClick={handleTimeSlotClick}
        onNewAppointment={handleNewAppointment}
      />

      {/* Appointment Form Dialog */}
      <AppointmentFormDialog
        open={showAppointmentForm}
        onOpenChange={setShowAppointmentForm}
        professionals={professionals}
        patients={patients}
        consultationTypes={consultationTypes}
        onSubmit={handleAppointmentSubmit}
        onCreatePatient={handleCreatePatient}
        defaultValues={appointmentFormData}
        mode={formMode}
      />

      {/* Appointment Details Sheet */}
      <AppointmentDetailsSheet
        appointment={selectedAppointment}
        open={showAppointmentDetails}
        onOpenChange={setShowAppointmentDetails}
        onEdit={handleEditAppointment}
        onComplete={handleCompleteAppointment}
        onCancel={handleCancelAppointment}
        onReschedule={handleRescheduleAppointment}
        onDelete={handleDeleteAppointment}
      />
    </div>
  )
}