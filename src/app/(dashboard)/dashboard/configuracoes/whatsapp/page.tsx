// WhatsApp configuration page
// Manages WhatsApp connection settings for the clinic

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WhatsAppConfigurationClient } from './client'

export default async function WhatsAppConfigurationPage() {
  const supabase = await createClient()

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect('/login')
  }

  // Get user's clinic
  const { data: clinic, error: clinicError } = await supabase
    .from('clinics')
    .select('id, name')
    .eq('user_id', user.id)
    .single()

  if (clinicError || !clinic) {
    redirect('/onboarding')
  }

  // Get existing WhatsApp connection
  const { data: connection } = await supabase
    .from('whatsapp_connections')
    .select('*')
    .eq('clinic_id', clinic.id)
    .single()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Configuração WhatsApp</h1>
        <p className="text-gray-600 mt-2">
          Configure a integração WhatsApp para comunicação com pacientes
        </p>
      </div>

      <WhatsAppConfigurationClient 
        clinic={clinic}
        initialConnection={connection}
      />
    </div>
  )
}