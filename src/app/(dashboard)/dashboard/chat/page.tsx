// Chat page - Main WhatsApp chat interface
// Server-side component that fetches initial data and renders client component

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ChatPageClient } from './client'

export default async function ChatPage() {
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

  // Get WhatsApp connection
  const { data: connection } = await supabase
    .from('whatsapp_connections')
    .select('*')
    .eq('clinic_id', clinic.id)
    .single()

  // Get initial conversations (without status filter to show all conversations)
  const { data: conversations } = await supabase
    .from('conversations')
    .select(`
      *,
      patient:patients(id, name, phone, email)
    `)
    .eq('clinic_id', clinic.id)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(50)

  // Get chat stats
  const { data: stats } = await supabase
    .from('chat_stats')
    .select('*')
    .eq('clinic_id', clinic.id)
    .single()

  return (
    <ChatPageClient
      clinic={clinic}
      connection={connection}
      initialConversations={conversations || []}
      stats={stats}
    />
  )
}