// API endpoint to update webhook configuration for existing instances
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { EvolutionService } from '@/features/chat/services/evolution.service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get clinic profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('clinic_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.clinic_id) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
    }

    const clinicId = profile.clinic_id

    // Get WhatsApp connection
    const { data: connection, error: connectionError } = await supabase
      .from('whatsapp_connections')
      .select('*')
      .eq('clinic_id', clinicId)
      .single()

    if (connectionError || !connection) {
      return NextResponse.json({ error: 'WhatsApp connection not found' }, { status: 404 })
    }

    // Get base URL from request
    const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`

    // Configure webhook using Evolution service
    await EvolutionService.configureWebhook(connection.instance_name, baseUrl)

    return NextResponse.json({
      message: 'Webhook updated successfully',
      webhookUrl: `${baseUrl}/api/webhooks/evolution`
    })

  } catch (error) {
    console.error('Error updating webhook:', error)
    return NextResponse.json(
      { error: 'Failed to update webhook configuration' },
      { status: 500 }
    )
  }
}