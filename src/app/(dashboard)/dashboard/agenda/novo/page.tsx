import React from 'react'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { ProfessionalService } from '@/features/appointments/services/professional.service'
import { AppointmentService } from '@/features/appointments/services/appointment.service'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { AppointmentFormDialog } from '@/features/appointments/components/dialogs/appointment-form-dialog'
import { NewAppointmentPageClient } from './novo-client'

interface NewAppointmentPageProps {
  searchParams: Promise<{
    date?: string
    time?: string
    patient_id?: string
    professional_id?: string
  }>
}

export default async function NewAppointmentPage({ searchParams }: NewAppointmentPageProps) {
  const supabase = await createClient()
  const params = await searchParams
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  try {
    // Fetch professionals
    const professionalsResult = await ProfessionalService.list({ per_page: 50 }, supabase)

    const defaultValues = {
      date: params.date || '',
      start_time: params.time || '',
      patient_id: params.patient_id || '',
      professional_id: params.professional_id || '',
      type: 'consultation' as const
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.history.back()}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              Novo Agendamento
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Form */}
        <NewAppointmentPageClient 
          professionals={professionalsResult.data}
          defaultValues={defaultValues}
        />
      </div>
    )
  } catch (error) {
    console.error('Error loading new appointment page:', error)
    redirect('/dashboard/agenda')
  }
}