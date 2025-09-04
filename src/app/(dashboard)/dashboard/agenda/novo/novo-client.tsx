'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { AppointmentFormDialog } from '@/features/appointments/components/dialogs/appointment-form-dialog'
import { AppointmentService } from '@/features/appointments/services/appointment.service'
import { createClient } from '@/lib/supabase/client'

import { Professional } from '@/features/appointments/types/appointment.types'
import { AppointmentFormData } from '@/features/appointments/types/appointment.schema'

interface NewAppointmentPageClientProps {
  professionals: Professional[]
  defaultValues: Partial<AppointmentFormData>
}

export function NewAppointmentPageClient({ 
  professionals, 
  defaultValues 
}: NewAppointmentPageClientProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (data: AppointmentFormData) => {
    setIsSubmitting(true)
    try {
      await AppointmentService.create(data, supabase)
      toast.success('Consulta agendada com sucesso!')
      router.push('/dashboard/agenda')
    } catch (error) {
      console.error('Error creating appointment:', error)
      toast.error(
        error instanceof Error 
          ? error.message 
          : 'Erro ao agendar consulta'
      )
      throw error // Re-throw to prevent dialog from closing
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreatePatient = () => {
    // Store current form data in session storage to restore later
    sessionStorage.setItem('appointmentFormData', JSON.stringify(defaultValues))
    router.push('/dashboard/clientes/novo?redirect=/dashboard/agenda/novo')
  }

  const handleCancel = () => {
    router.push('/dashboard/agenda')
  }

  return (
    <AppointmentFormDialog
      open={true}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          handleCancel()
        }
      }}
      professionals={professionals}
      onSubmit={handleSubmit}
      onCreatePatient={handleCreatePatient}
      defaultValues={defaultValues}
      mode="create"
      title="Novo Agendamento"
    />
  )
}