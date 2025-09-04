import React from 'react'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { NewProfessionalPageClient } from './novo-client'

export default async function NewProfessionalPage() {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  return <NewProfessionalPageClient />
}