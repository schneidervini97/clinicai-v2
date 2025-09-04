import React from 'react'
import { redirect, notFound } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { ProfessionalService } from '@/features/appointments/services/professional.service'
import { ScheduleConfigPageClient } from './horarios-client'

interface ScheduleConfigPageProps {
  params: Promise<{ id: string }>
}

export default async function ScheduleConfigPage({ params }: ScheduleConfigPageProps) {
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

    // Fetch professional schedules from the correct table
    const schedules = await ProfessionalService.getSchedules(id, supabase)

    return (
      <ScheduleConfigPageClient 
        professional={professional} 
        initialSchedules={schedules}
      />
    )
  } catch (error) {
    console.error('Error fetching schedule data:', error)
    notFound()
  }
}