import React from 'react'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { ProfessionalService } from '@/features/appointments/services/professional.service'
import { ProfessionalsPageClient } from './profissionais-client'

export default async function ProfessionalsPage() {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  try {
    // Fetch professionals
    const professionals = await ProfessionalService.list({}, { per_page: 100 }, supabase)

    return (
      <ProfessionalsPageClient
        initialProfessionals={professionals}
      />
    )
  } catch (error) {
    console.error('Error loading professionals:', error)
    
    // Fallback with empty data
    return (
      <ProfessionalsPageClient
        initialProfessionals={[]}
      />
    )
  }
}