import React from 'react'
import { redirect, notFound } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { ProfessionalService } from '@/features/appointments/services/professional.service'
import { EditProfessionalPageClient } from './editar-client'

interface EditProfessionalPageProps {
  params: Promise<{ id: string }>
}

export default async function EditProfessionalPage({ params }: EditProfessionalPageProps) {
  const { id } = await params
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  try {
    // Fetch professional data
    const professional = await ProfessionalService.findById(id, supabase)
    if (!professional) {
      notFound()
    }

    return <EditProfessionalPageClient professional={professional} />
  } catch (error) {
    console.error('Error fetching professional:', error)
    notFound()
  }
}