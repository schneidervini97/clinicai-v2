// Chat system types for WhatsApp integration with Evolution API

export interface WhatsAppConnection {
  id: string
  clinic_id: string
  instance_name: string
  phone_number?: string
  evolution_instance_id?: string
  qr_code?: string
  status: 'disconnected' | 'qr_code' | 'connected' | 'error'
  webhook_url?: string
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  clinic_id: string
  patient_id?: string
  patient_phone: string
  patient_name?: string
  last_message_at?: string
  last_message_preview?: string
  unread_count: number
  status: 'active' | 'archived'
  ai_assistant_enabled: boolean
  created_at: string
  updated_at: string
  patient?: {
    id: string
    name: string
    phone: string
    email?: string
  }
}

export interface Message {
  id: string
  conversation_id: string
  clinic_id: string
  content?: string
  message_type: 'text' | 'image' | 'audio' | 'document' | 'video' | 'sticker' | 'location' | 'contact'
  media_url?: string
  media_caption?: string
  direction: 'inbound' | 'outbound'
  status: 'sent' | 'delivered' | 'read' | 'failed'
  evolution_message_id?: string
  created_at: string
  read_at?: string
  // New media metadata fields
  media_mime_type?: string
  media_size?: number
  media_width?: number
  media_height?: number
  media_duration?: number
  media_thumbnail?: string
  media_waveform?: string
  is_voice_note?: boolean
}

export interface WhatsAppContact {
  id: string
  clinic_id: string
  phone: string
  name?: string
  push_name?: string
  profile_picture_url?: string
  last_seen?: string
  created_at: string
  updated_at: string
}

export interface ChatStats {
  clinic_id: string
  total_conversations: number
  active_conversations: number
  total_unread: number
  conversations_24h: number
}

// Evolution API Types
export interface EvolutionInstance {
  instanceName: string
  status: 'open' | 'close' | 'connecting'
  qrcode?: string
  phone?: string
}

export interface EvolutionWebhookEvent {
  event: string
  instance: string
  data: any
}

export interface EvolutionMessage {
  messageId: string
  chatId: string
  fromMe: boolean
  message: {
    conversation?: string
    imageMessage?: {
      url: string
      caption?: string
    }
    audioMessage?: {
      url: string
    }
    documentMessage?: {
      url: string
      fileName: string
      caption?: string
    }
    videoMessage?: {
      url: string
      caption?: string
    }
    stickerMessage?: {
      url: string
    }
    locationMessage?: {
      latitude: number
      longitude: number
      name?: string
      address?: string
    }
    contactMessage?: {
      displayName: string
      vcard: string
    }
  }
  messageTimestamp: number
  pushName?: string
  status?: 'ERROR' | 'PENDING' | 'SERVER_ACK' | 'DELIVERY_ACK' | 'READ'
}

export interface EvolutionContact {
  id: string
  name?: string
  pushName?: string
  profilePictureUrl?: string
  isGroup: boolean
  isMyContact: boolean
}

// API Request/Response Types
export interface CreateInstanceRequest {
  instanceName: string
  integration: 'WHATSAPP-BAILEYS'
  qrcode?: boolean
  rejectCall?: boolean
  groupsIgnore?: boolean
  readMessages?: boolean
  readStatus?: boolean
  syncFullHistory?: boolean
  webhook?: {
    url: string
    byEvents?: boolean
    base64?: boolean
    events?: string[]
  }
}

export interface SendMessageRequest {
  number: string
  message: string
}

export interface SendMediaRequest {
  number: string
  mediaUrl: string
  caption?: string
  fileName?: string
}

export interface WebhookConfigRequest {
  url: string
  webhook_by_events?: boolean
  webhook_base64?: boolean
  events?: string[]
}

// Frontend State Types
export interface ChatState {
  connections: WhatsAppConnection[]
  conversations: Conversation[]
  messages: Record<string, Message[]> // conversationId -> messages
  selectedConversation?: Conversation
  loading: boolean
  error?: string
}

export interface SendMessageInput {
  conversationId: string
  content: string
  type: 'text' | 'media'
  mediaUrl?: string
  caption?: string
}

// Realtime subscription types
export type RealtimePayload<T = any> = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: T
  old: T
  errors?: any
}

export interface MessageRealtimePayload extends RealtimePayload<Message> {}
export interface ConversationRealtimePayload extends RealtimePayload<Conversation> {}

// Form schemas
export interface ConnectionFormData {
  instanceName: string
  webhookUrl?: string
}

export interface MessageFormData {
  content: string
  type: 'text'
}

// Utility types
export type MessageWithConversation = Message & {
  conversation: Conversation
}

export type ConversationWithMessages = Conversation & {
  messages: Message[]
  lastMessage?: Message
}

export type ConversationWithPatient = Conversation & {
  patient?: {
    id: string
    name: string
    phone: string
    email?: string
  }
}

// Filter and pagination types
export interface ConversationFilters {
  status?: 'active' | 'archived'
  hasUnread?: boolean
  search?: string
  patientId?: string
}

export interface MessageFilters {
  conversationId: string
  messageType?: Message['message_type']
  direction?: 'inbound' | 'outbound'
  startDate?: string
  endDate?: string
}

export interface PaginationParams {
  page?: number
  per_page?: number
  sort?: 'asc' | 'desc'
  sort_by?: string
}

// Evolution API webhook event types
export type EvolutionWebhookEventType = 
  | 'APPLICATION_STARTUP'
  | 'QRCODE_UPDATED' 
  | 'MESSAGES_UPSERT'
  | 'MESSAGES_UPDATE'
  | 'MESSAGES_DELETE'
  | 'SEND_MESSAGE'
  | 'CONNECTION_UPDATE'
  | 'TYPEBOT_START'
  | 'TYPEBOT_CHANGE_STATUS'

// Connection states from Evolution API
export type EvolutionConnectionState = 
  | 'close'
  | 'connecting' 
  | 'open'

// Message status from WhatsApp
export type WhatsAppMessageStatus = 
  | 'ERROR'
  | 'PENDING' 
  | 'SERVER_ACK'
  | 'DELIVERY_ACK'
  | 'READ'