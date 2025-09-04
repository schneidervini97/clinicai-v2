// Evolution API webhook handler
// Receives and processes webhooks from Evolution API for WhatsApp events

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ChatService } from '@/features/chat/services/chat.service'
import { EvolutionService } from '@/features/chat/services/evolution.service'
import { MarketingService } from '@/features/marketing/services/marketing.service'
import { 
  EvolutionWebhookEvent, 
  EvolutionMessage,
  Message
} from '@/features/chat/types/chat.types'

export async function POST(request: NextRequest) {
  try {
    const body: EvolutionWebhookEvent = await request.json()
    
    console.log('Evolution webhook received:', {
      event: body.event,
      instance: body.instance,
      timestamp: new Date().toISOString(),
      hasData: !!body.data,
      dataType: typeof body.data
    })

    // Validate webhook data
    if (!body.event || !body.instance) {
      console.error('Invalid webhook data: missing event or instance')
      return NextResponse.json(
        { error: 'Invalid webhook data' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Get clinic by instance name
    const { data: connection } = await supabase
      .from('whatsapp_connections')
      .select('clinic_id')
      .eq('instance_name', body.instance)
      .single()

    if (!connection) {
      console.error('No connection found for instance:', body.instance)
      return NextResponse.json(
        { error: 'Instance not found' },
        { status: 404 }
      )
    }

    const clinicId = connection.clinic_id

    // Process different event types
    switch (body.event) {
      case 'MESSAGES_UPSERT':
      case 'messages.upsert':
        await handleMessageUpsert(body.data, body.instance, clinicId, supabase)
        break

      case 'MESSAGES_UPDATE':
      case 'messages.update':
        await handleMessageUpdate(body.data, body.instance, clinicId, supabase)
        break

      case 'CONNECTION_UPDATE':
      case 'connection.update':
        await handleConnectionUpdate(body.data, body.instance, supabase)
        break

      case 'QRCODE_UPDATED':
      case 'qrcode.updated':
        await handleQRCodeUpdate(body.data, body.instance, supabase)
        break

      case 'SEND_MESSAGE':
      case 'send.message':
        await handleSendMessage(body.data, body.instance, clinicId, supabase)
        break

      default:
        console.log('Unhandled event type:', body.event)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Evolution webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleMessageUpsert(
  data: any, 
  instanceName: string, 
  clinicId: string, 
  supabase: any
) {
  try {
    console.log('Processing message upsert:', {
      instanceName,
      clinicId,
      hasKey: !!data.key,
      hasMessage: !!data.message,
      pushName: data.pushName
    })
    // Estrutura correta do Evolution API v2
    const key = data.key
    const chatId = key?.remoteJid
    const fromMe = key?.fromMe
    const pushName = data.pushName
    const messageContent = data.message
    
    if (!chatId) {
      console.log('No chatId found in message')
      return
    }

    // Check for duplicates using evolution_message_id
    if (key?.id) {
      const { data: existingMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('evolution_message_id', key.id)
        .eq('clinic_id', clinicId)

      if (existingMessages && existingMessages.length > 0) {
        console.log('Message already exists, skipping duplicate:', key.id)
        return
      }
    }

    // For messages sent by us (fromMe = true), we still process them
    // but mark them as outbound to maintain sync with WhatsApp Web
    const direction = fromMe ? 'outbound' : 'inbound'

    // Extract phone number from chatId
    const phone = EvolutionService.extractPhoneFromJid(chatId)
    
    // Skip group messages for now
    if (EvolutionService.isGroupJid(chatId)) {
      console.log('Skipping group message:', chatId)
      return
    }
    
    // Validate phone number
    if (!phone || phone.length < 10) {
      console.log('Invalid phone number extracted:', { chatId, phone })
      return
    }

    // Don't use pushName for messages sent by us (it's our name, not the contact's)
    const contactNameToUse = fromMe ? null : pushName

    // Find or create conversation
    const conversation = await ChatService.findOrCreateConversation(
      clinicId,
      phone,
      contactNameToUse,
      supabase
    )
    
    console.log('📋 Conversation details:', {
      conversationId: conversation.id,
      phone,
      patientName: conversation.patient_name,
      status: conversation.status,
      clinicId: conversation.clinic_id,
      createdAt: conversation.created_at
    })

    // If this is an inbound message with pushName and conversation still has phone as name,
    // update conversation with the real contact name
    if (!fromMe && pushName && conversation.patient_name === phone) {
      console.log('Updating conversation name from phone to pushName:', {
        conversationId: conversation.id,
        oldName: conversation.patient_name,
        newName: pushName
      })
      
      await ChatService.updateConversation(
        conversation.id,
        { patient_name: pushName },
        supabase
      )
      
      // Update local conversation object for logging
      conversation.patient_name = pushName
    }

    // Create or update contact
    if (pushName) {
      await ChatService.findOrCreateContact(
        clinicId,
        phone,
        {
          name: pushName,
          push_name: pushName
        },
        supabase
      )
    }

    // Process message content based on type
    let messageType: Message['message_type'] = 'text'
    let content: string | undefined
    let mediaUrl: string | undefined
    let mediaCaption: string | undefined
    
    // New media metadata fields
    let mediaMimeType: string | undefined
    let mediaSize: number | undefined
    let mediaWidth: number | undefined
    let mediaHeight: number | undefined
    let mediaDuration: number | undefined
    let mediaThumbnail: string | undefined
    let mediaWaveform: string | undefined
    let isVoiceNote: boolean = false

    if (messageContent.conversation) {
      messageType = 'text'
      content = messageContent.conversation
    } else if (messageContent.imageMessage) {
      messageType = 'image'
      mediaUrl = data.message?.mediaUrl || messageContent.imageMessage.url
      mediaCaption = messageContent.imageMessage.caption
      content = mediaCaption || '[Imagem]'
      
      // Extract image metadata
      mediaMimeType = messageContent.imageMessage.mimetype
      mediaSize = messageContent.imageMessage.fileLength ? parseInt(messageContent.imageMessage.fileLength) : undefined
      mediaWidth = messageContent.imageMessage.width
      mediaHeight = messageContent.imageMessage.height
      mediaThumbnail = messageContent.imageMessage.jpegThumbnail
    } else if (messageContent.audioMessage) {
      messageType = 'audio'
      mediaUrl = data.message?.mediaUrl || messageContent.audioMessage.url
      content = messageContent.audioMessage.ptt ? '[Mensagem de voz]' : '[Áudio]'
      
      // Extract audio metadata
      mediaMimeType = messageContent.audioMessage.mimetype
      mediaSize = messageContent.audioMessage.fileLength ? parseInt(messageContent.audioMessage.fileLength) : undefined
      mediaDuration = messageContent.audioMessage.seconds
      isVoiceNote = messageContent.audioMessage.ptt || false
      mediaWaveform = messageContent.audioMessage.waveform
    } else if (messageContent.documentMessage) {
      messageType = 'document'
      mediaUrl = data.message?.mediaUrl || messageContent.documentMessage.url
      mediaCaption = messageContent.documentMessage.caption
      content = messageContent.documentMessage.fileName || '[Documento]'
      
      // Extract document metadata
      mediaMimeType = messageContent.documentMessage.mimetype
      mediaSize = messageContent.documentMessage.fileLength ? parseInt(messageContent.documentMessage.fileLength) : undefined
    } else if (messageContent.videoMessage) {
      messageType = 'video'
      mediaUrl = data.message?.mediaUrl || messageContent.videoMessage.url
      mediaCaption = messageContent.videoMessage.caption
      content = mediaCaption || '[Vídeo]'
      
      // Extract video metadata
      mediaMimeType = messageContent.videoMessage.mimetype
      mediaSize = messageContent.videoMessage.fileLength ? parseInt(messageContent.videoMessage.fileLength) : undefined
      mediaWidth = messageContent.videoMessage.width
      mediaHeight = messageContent.videoMessage.height
      mediaDuration = messageContent.videoMessage.seconds
      mediaThumbnail = messageContent.videoMessage.jpegThumbnail
    } else if (messageContent.stickerMessage) {
      messageType = 'sticker'
      mediaUrl = data.message?.mediaUrl || messageContent.stickerMessage.url
      content = '[Sticker]'
      
      // Extract sticker metadata
      mediaMimeType = messageContent.stickerMessage.mimetype
      mediaSize = messageContent.stickerMessage.fileLength ? parseInt(messageContent.stickerMessage.fileLength) : undefined
      mediaWidth = messageContent.stickerMessage.width
      mediaHeight = messageContent.stickerMessage.height
    } else if (messageContent.locationMessage) {
      messageType = 'location'
      content = `📍 ${messageContent.locationMessage.name || 'Localização'}`
      if (messageContent.locationMessage.address) {
        content += `\n${messageContent.locationMessage.address}`
      }
    } else if (messageContent.contactMessage) {
      messageType = 'contact'
      content = `👤 ${messageContent.contactMessage.displayName}`
    } else {
      console.log('Unknown message type, defaulting to text:', Object.keys(messageContent))
      content = '[Mensagem não suportada]'
    }

    // Save message to database
    const savedMessage = await ChatService.createMessage(
      conversation.id,
      clinicId,
      {
        content,
        message_type: messageType,
        media_url: mediaUrl,
        media_caption: mediaCaption,
        direction,
        evolution_message_id: key.id,
        status: 'sent',
        // New media metadata fields
        media_mime_type: mediaMimeType,
        media_size: mediaSize,
        media_width: mediaWidth,
        media_height: mediaHeight,
        media_duration: mediaDuration,
        media_thumbnail: mediaThumbnail,
        media_waveform: mediaWaveform,
        is_voice_note: isVoiceNote
      },
      supabase
    )

    // Process media in background for non-text messages
    if (messageType !== 'text' && key.id) {
      console.log('🎬 Scheduling media processing for message:', {
        messageId: savedMessage.id,
        messageType,
        evolutionMessageId: key.id
      })
      
      // Process media asynchronously (don't await to avoid blocking webhook)
      processMediaInBackground(instanceName, savedMessage.id, key, messageType, supabase)
        .catch(error => {
          console.error('❌ Media processing failed:', {
            messageId: savedMessage.id,
            error: error.message
          })
        })
    }

    console.log('Message saved successfully:', {
      conversationId: conversation.id,
      messageType,
      phone,
      direction,
      fromMe,
      source: fromMe ? 'WhatsApp Web/Mobile' : 'Contact',
      content: content?.substring(0, 50) + (content?.length > 50 ? '...' : ''),
      evolutionMessageId: key.id
    })

    // Process marketing lead tracking for inbound messages only
    if (!fromMe && direction === 'inbound') {
      console.log('📊 Processing marketing tracking for inbound message:', {
        phone,
        conversationId: conversation.id,
        content: content?.substring(0, 100)
      })
      
      try {
        await MarketingService.processEvolutionMessage(
          clinicId,
          phone,
          conversation.id,
          data, // Full webhook payload
          content || '', // Message content for UTM detection
          supabase
        )
      } catch (marketingError) {
        // Don't fail the main webhook flow if marketing processing fails
        console.error('Marketing processing error (non-blocking):', {
          error: marketingError.message,
          phone,
          conversationId: conversation.id
        })
      }
    }

  } catch (error) {
    console.error('Error handling message upsert:', {
      error: error.message,
      stack: error.stack,
      instanceName,
      clinicId
    })
    throw error
  }
}

async function handleMessageUpdate(
  data: any,
  instanceName: string,
  clinicId: string,
  supabase: any
) {
  try {
    const message: EvolutionMessage = data

    // Find message by evolution_message_id and update status
    const { error } = await supabase
      .from('messages')
      .update({
        status: mapEvolutionStatusToLocal(message.status)
      })
      .eq('evolution_message_id', message.messageId)
      .eq('clinic_id', clinicId)

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to update message status: ${error.message}`)
    }

  } catch (error) {
    console.error('Error handling message update:', error)
    throw error
  }
}

async function handleConnectionUpdate(
  data: any,
  instanceName: string,
  supabase: any
) {
  try {
    console.log('Processing connection update:', {
      instanceName,
      state: data.state,
      phoneNumber: data.phoneNumber
    })
    
    const connectionState = data.state // 'open', 'close', 'connecting'
    
    let status: 'connected' | 'disconnected' | 'qr_code' | 'error'
    switch (connectionState) {
      case 'open':
        status = 'connected'
        break
      case 'close':
        status = 'disconnected'
        break
      case 'connecting':
        status = 'qr_code' // Connecting means waiting for QR scan
        break
      default:
        status = 'error'
    }

    // Update connection status
    const { error } = await supabase
      .from('whatsapp_connections')
      .update({
        status,
        phone_number: data.phoneNumber || null,
        updated_at: new Date().toISOString()
      })
      .eq('instance_name', instanceName)

    if (error) {
      throw new Error(`Failed to update connection status: ${error.message}`)
    }

    console.log('Connection status updated:', { instanceName, status })

  } catch (error) {
    console.error('Error handling connection update:', error)
    throw error
  }
}

async function handleQRCodeUpdate(
  data: any,
  instanceName: string,
  supabase: any
) {
  try {
    // Debug: Log the complete webhook data structure
    console.log('QR Code webhook raw data:', {
      type: typeof data,
      keys: Object.keys(data),
      fullData: JSON.stringify(data, null, 2)
    })
    
    // Extract the base64 QR code from the object structure
    const qrCodeObj = data.qrcode || data.qrCode || data.qr || data
    const qrCodeStr = typeof qrCodeObj === 'object' && qrCodeObj?.base64
      ? qrCodeObj.base64
      : (typeof qrCodeObj === 'string' ? qrCodeObj : null)
    
    console.log('Processing QR code update:', {
      instanceName,
      availableFields: Object.keys(data),
      qrCodeType: typeof qrCodeObj,
      dataStructure: typeof qrCodeObj === 'object' && qrCodeObj ? Object.keys(qrCodeObj) : 'not_object',
      qrCode: qrCodeStr ? `${qrCodeStr.substring(0, 50)}...` : 'null',
      qrCodeLength: qrCodeStr?.length
    })
    
    console.log('QR code extracted:', {
      hasBase64: !!qrCodeStr,
      isDataUrl: qrCodeStr?.startsWith('data:image'),
      length: qrCodeStr?.length
    })
    
    if (!qrCodeStr) {
      console.warn('No QR code found in webhook data:', data)
      return
    }
    
    // Update QR code in database
    const { error } = await supabase
      .from('whatsapp_connections')
      .update({
        qr_code: qrCodeStr,
        status: 'qr_code',
        updated_at: new Date().toISOString()
      })
      .eq('instance_name', instanceName)

    if (error) {
      throw new Error(`Failed to update QR code: ${error.message}`)
    }

    console.log('QR code updated for instance:', instanceName)

  } catch (error) {
    console.error('Error handling QR code update:', error)
    throw error
  }
}

async function handleSendMessage(
  data: any,
  instanceName: string,
  clinicId: string,
  supabase: any
) {
  try {
    // This event is triggered when we send a message
    // We can use it to update message status or for logging
    
    if (data.key?.id) {
      const { error } = await supabase
        .from('messages')
        .update({
          evolution_message_id: data.key.id,
          status: 'sent'
        })
        .eq('clinic_id', clinicId)
        .is('evolution_message_id', null)
        .eq('direction', 'outbound')
        .order('created_at', { ascending: false })
        .limit(1)

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to update sent message:', error)
      }
    }

  } catch (error) {
    console.error('Error handling send message:', error)
    throw error
  }
}

// Helper function to map Evolution API message status to our local status
function mapEvolutionStatusToLocal(
  evolutionStatus?: 'ERROR' | 'PENDING' | 'SERVER_ACK' | 'DELIVERY_ACK' | 'READ'
): Message['status'] {
  switch (evolutionStatus) {
    case 'ERROR':
      return 'failed'
    case 'PENDING':
      return 'sent'
    case 'SERVER_ACK':
      return 'sent'
    case 'DELIVERY_ACK':
      return 'delivered'
    case 'READ':
      return 'read'
    default:
      return 'sent'
  }
}

// Process media in background to get full base64
async function processMediaInBackground(
  instanceName: string,
  messageId: string,
  messageKey: { id: string },
  messageType: string,
  supabase: any
): Promise<void> {
  try {
    console.log('🎬 Starting media processing:', {
      messageId,
      messageType,
      evolutionMessageId: messageKey.id
    })

    // Mark as processing
    await supabase
      .from('messages')
      .update({ 
        media_processing_status: 'processing'
      })
      .eq('id', messageId)

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
      
      // Update message with base64 data
      const { error } = await supabase
        .from('messages')
        .update({
          media_base64: dataUrl,
          media_processing_status: 'completed'
        })
        .eq('id', messageId)

      if (error) {
        throw new Error(`Failed to update message with base64: ${error.message}`)
      }

      console.log('✅ Media processing completed:', {
        messageId,
        messageType,
        dataUrlSize: dataUrl.length,
        mimetype: mediaResponse.mimetype
      })
    } else {
      throw new Error('No media data received from Evolution API')
    }

  } catch (error) {
    console.error('❌ Media processing error:', {
      messageId,
      messageType,
      error: error.message
    })

    // Mark as failed
    await supabase
      .from('messages')
      .update({ 
        media_processing_status: 'failed'
      })
      .eq('id', messageId)
      .catch(updateError => {
        console.error('Failed to mark media as failed:', updateError)
      })
  }
}

// Allow only POST requests
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}