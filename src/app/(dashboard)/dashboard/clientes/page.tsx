import { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { PatientService } from '@/features/patients/services/patient.service'
import { ClientesPageClient } from './client'

export const metadata: Metadata = {
  title: 'Pacientes | Clínicas System',
  description: 'Gerenciar pacientes da clínica',
}

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Buscar pacientes
  let patients = []
  try {
    const result = await PatientService.search({}, { per_page: 100 }, supabase)
    patients = result.data || []
  } catch (err) {
    console.error('Error fetching patients:', err)
    // Return empty array on error - client component will show error state
    patients = []
  }

  return <ClientesPageClient initialPatients={patients} />
}