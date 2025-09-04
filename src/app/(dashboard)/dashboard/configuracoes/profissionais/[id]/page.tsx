import React from 'react'
import { redirect, notFound } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { ProfessionalService } from '@/features/appointments/services/professional.service'
import { ProfessionalDetailsClient } from './profissional-client'

interface ProfessionalPageProps {
  params: Promise<{ id: string }>
}

export default async function ProfessionalPage({ params }: ProfessionalPageProps) {
  const { id } = await params
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  try {
    // Fetch professional details
    const professional = await ProfessionalService.findById(id, supabase)
    
    if (!professional) {
      notFound()
    }

    return (
      <ProfessionalDetailsClient professional={professional} />
    )
  } catch (error) {
    console.error('Error loading professional:', error)
    notFound()
  }
}