// API endpoint to process media queue
// Processes pending media messages and fetches base64 from Evolution API

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

    // Get WhatsApp connection for instance name
    const { data: connection, error: connectionError } = await supabase
      .from('whatsapp_connections')
      .select('instance_name')
      .eq('clinic_id', clinicId)
      .single()

    if (connectionError || !connection) {
      return NextResponse.json({ error: 'WhatsApp connection not found' }, { status: 404 })
    }

    // Get pending media messages (limit 10 to avoid timeout)
    const { data: pendingMessages, error: messagesError } = await supabase
      .from('messages')
      .select('id, evolution_message_id, message_type, media_processing_status')
      .eq('clinic_id', clinicId)
      .neq('message_type', 'text')
      .in('media_processing_status', ['pending', 'failed'])
      .is('media_base64', null)
      .order('created_at', { ascending: true })
      .limit(10)

    if (messagesError) {
      throw new Error(`Failed to fetch pending messages: ${messagesError.message}`)
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      return NextResponse.json({
        message: 'No pending media messages to process',
        processed: 0
      })
    }

    console.log('🔄 Processing media queue:', {
      clinicId,
      instanceName: connection.instance_name,
      pendingCount: pendingMessages.length
    })

    let processed = 0
    let failed = 0

    // Process each message
    for (const message of pendingMessages) {
      if (!message.evolution_message_id) {
        console.log(`⚠️ Skipping message ${message.id} - no evolution_message_id`)
        continue
      }

      try {
        await processMediaMessage(
          connection.instance_name,
          message.id,
          { id: message.evolution_message_id },
          message.message_type,
          supabase
        )
        processed++
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (error) {
        console.error(`❌ Failed to process media ${message.id}:`, error)
        failed++
      }
    }

    return NextResponse.json({
      message: 'Media queue processing completed',
      total: pendingMessages.length,
      processed,
      failed
    })

  } catch (error) {
    console.error('Error processing media queue:', error)
    return NextResponse.json(
      { error: 'Failed to process media queue' },
      { status: 500 }
    )
  }
}

// Extracted media processing function (same as in webhook)
async function processMediaMessage(
  instanceName: string,
  messageId: string,
  messageKey: { id: string },
  messageType: string,
  supabase: any
): Promise<void> {
  console.log('🎬 Processing media:', {
    messageId,
    messageType,
    evolutionMessageId: messageKey.id
  })

  // Mark as processing
  await supabase
    .from('messages')
    .update({ media_processing_status: 'processing' })
    .eq('id', messageId)

  try {
    // Determine if we need MP4 conversion for videos
    const convertToMp4 = messageType === 'video'

    // Get base64 from Evolution API
    const mediaResponse = await EvolutionService.getBase64FromMediaMessage(
      instanceName,
      messageKey,
      convertToMp4
    )

    if (mediaResponse.media) {
      // Create data URL
      const dataUrl = `data:${mediaResponse.mimetype};base64,${mediaResponse.media}`
      
      // Check size limit (10MB base64 ≈ 7.5MB file)
      if (dataUrl.length > 10 * 1024 * 1024) {
        throw new Error(`Media too large: ${Math.round(dataUrl.length / 1024 / 1024)}MB`)
      }
      
      // Update message with base64 data
      const { error } = await supabase
        .from('messages')
        .update({
          media_base64: dataUrl,
          media_processing_status: 'completed'
        })
        .eq('id', messageId)

      if (error) {
        throw new Error(`Failed to update message: ${error.message}`)
      }

      console.log('✅ Media processed successfully:', {
        messageId,
        dataUrlSize: Math.round(dataUrl.length / 1024) + 'KB',
        mimetype: mediaResponse.mimetype
      })
    } else {
      throw new Error('No media data received from Evolution API')
    }

  } catch (error) {
    // Mark as failed
    await supabase
      .from('messages')
      .update({ media_processing_status: 'failed' })
      .eq('id', messageId)

    throw error
  }
}