import React from 'react'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { AppointmentService } from '@/features/appointments/services/appointment.service'
import { ProfessionalService } from '@/features/appointments/services/professional.service'
import { PatientService } from '@/features/patients/services/patient.service'
import { AgendaPageClient } from './agenda-client'

export default async function AgendaPage() {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  try {
    // Fetch initial data in parallel
    const [appointmentsResult, professionalsResult, patientsResult] = await Promise.all([
      AppointmentService.search(
        {}, // No filters - get all appointments
        { per_page: 100, sort_by: 'date', sort_order: 'asc' },
        supabase
      ),
      ProfessionalService.list({}, { per_page: 50 }, supabase),
      PatientService.search({}, { per_page: 100, sort_by: 'name', sort_order: 'asc' }, supabase)
    ])

    console.log('AgendaPage - professionalsResult:', professionalsResult)
    console.log('AgendaPage - patientsResult:', patientsResult)
    console.log('AgendaPage - appointmentsResult:', appointmentsResult)

    return (
      <AgendaPageClient
        initialAppointments={appointmentsResult.data}
        professionals={professionalsResult}
        patients={patientsResult.data}
      />
    )
  } catch (error) {
    console.error('Error loading agenda data:', error)
    
    // Fallback with empty data
    return (
      <AgendaPageClient
        initialAppointments={[]}
        professionals={[]}
        patients={[]}
      />
    )
  }
}