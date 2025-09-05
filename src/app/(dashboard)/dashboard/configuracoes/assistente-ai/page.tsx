import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AssistantConfigClient } from './assistant-config-client'

export const metadata: Metadata = {
  title: 'Assistente AI',
  description: 'Configure o assistente inteligente para atendimento automatizado'
}

export default async function AssistantAIPage() {
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <AssistantConfigClient />
    </div>
  )
}