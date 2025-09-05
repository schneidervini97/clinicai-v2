// Chat service for database operations
// Handles CRUD operations for chat system

import { SupabaseClient } from '@supabase/supabase-js'
import { 
  WhatsAppConnection, 
  Conversation, 
  Message, 
  WhatsAppContact,
  ChatStats,
  ConversationFilters,
  MessageFilters,
  PaginationParams,
  ConversationWithPatient
} from '../types/chat.types'

export class ChatService {
  // WhatsApp Connection Management
  static async getConnection(clinicId: string, supabase: SupabaseClient): Promise<WhatsAppConnection | null> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('clinic_id', clinicId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // No connection found
        }
        throw new Error(`Failed to fetch WhatsApp connection: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error fetching WhatsApp connection:', error)
      throw error
    }
  }

  static async createConnection(
    clinicId: string, 
    instanceName: string, 
    webhookUrl: string,
    supabase: SupabaseClient
  ): Promise<WhatsAppConnection> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .insert({
          clinic_id: clinicId,
          instance_name: instanceName,
          webhook_url: webhookUrl,
          status: 'disconnected'
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create WhatsApp connection: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error creating WhatsApp connection:', error)
      throw error
    }
  }

  static async updateConnection(
    connectionId: string,
    updates: Partial<Pick<WhatsAppConnection, 'phone_number' | 'evolution_instance_id' | 'qr_code' | 'status'>>,
    supabase: SupabaseClient
  ): Promise<WhatsAppConnection> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update WhatsApp connection: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error updating WhatsApp connection:', error)
      throw error
    }
  }

  static async deleteConnection(connectionId: string, supabase: SupabaseClient): Promise<void> {
    try {
      const { error } = await supabase
        .from('whatsapp_connections')
        .delete()
        .eq('id', connectionId)

      if (error) {
        throw new Error(`Failed to delete WhatsApp connection: ${error.message}`)
      }
    } catch (error) {
      console.error('Error deleting WhatsApp connection:', error)
      throw error
    }
  }

  // Conversation Management
  static async getConversations(
    clinicId: string,
    filters: ConversationFilters = {},
    pagination: PaginationParams = {},
    supabase: SupabaseClient
  ): Promise<ConversationWithPatient[]> {
    try {
      let query = supabase
        .from('conversations')
        .select(`
          *,
          patient:patients(id, name, phone, email)
        `)
        .eq('clinic_id', clinicId)

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.hasUnread) {
        query = query.gt('unread_count', 0)
      }

      if (filters.search) {
        query = query.or(`patient_name.ilike.%${filters.search}%,patient_phone.ilike.%${filters.search}%`)
      }

      if (filters.patientId) {
        query = query.eq('patient_id', filters.patientId)
      }

      // Apply sorting
      const sortBy = pagination.sort_by || 'last_message_at'
      const sortOrder = pagination.sort || 'desc'
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })

      // Apply pagination
      if (pagination.page && pagination.per_page) {
        const from = (pagination.page - 1) * pagination.per_page
        const to = from + pagination.per_page - 1
        query = query.range(from, to)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch conversations: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error fetching conversations:', error)
      throw error
    }
  }

  static async getConversation(
    conversationId: string,
    supabase: SupabaseClient
  ): Promise<ConversationWithPatient | null> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          patient:patients(id, name, phone, email)
        `)
        .eq('id', conversationId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(`Failed to fetch conversation: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error fetching conversation:', error)
      throw error
    }
  }

  static async findOrCreateConversation(
    clinicId: string,
    phone: string,
    contactName?: string,
    supabase: SupabaseClient
  ): Promise<Conversation> {
    try {
      // First, try to find existing conversation
      const { data: existing, error: findError } = await supabase
        .from('conversations')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('patient_phone', phone)
        .maybeSingle()

      if (existing && !findError) {
        return existing
      }

      // Check if phone belongs to a patient
      const { data: patient } = await supabase
        .from('patients')
        .select('id, name')
        .eq('clinic_id', clinicId)
        .eq('phone', phone)
        .single()

      // Create new conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          clinic_id: clinicId,
          patient_id: patient?.id || null,
          patient_phone: phone,
          patient_name: contactName || patient?.name || phone,
          status: 'active'
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create conversation: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error finding/creating conversation:', error)
      throw error
    }
  }

  static async updateConversation(
    conversationId: string,
    updates: Partial<Pick<Conversation, 'patient_id' | 'patient_name' | 'status' | 'ai_assistant_enabled'>>,
    supabase: SupabaseClient
  ): Promise<Conversation> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update conversation: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error updating conversation:', error)
      throw error
    }
  }

  static async updateAssistantStatus(
    conversationId: string,
    enabled: boolean,
    supabase: SupabaseClient
  ): Promise<Conversation> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .update({
          ai_assistant_enabled: enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update AI assistant status: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error updating AI assistant status:', error)
      throw error
    }
  }

  static async deleteConversation(
    conversationId: string,
    supabase: SupabaseClient
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)

      if (error) {
        throw new Error(`Failed to delete conversation: ${error.message}`)
      }
    } catch (error) {
      console.error('Error deleting conversation:', error)
      throw error
    }
  }

  static async markConversationAsRead(
    conversationId: string,
    supabase: SupabaseClient
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({
          unread_count: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)

      if (error) {
        throw new Error(`Failed to mark conversation as read: ${error.message}`)
      }
    } catch (error) {
      console.error('Error marking conversation as read:', error)
      throw error
    }
  }

  // Message Management
  static async getMessages(
    filters: MessageFilters,
    pagination: PaginationParams = {},
    supabase: SupabaseClient
  ): Promise<Message[]> {
    try {
      let query = supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', filters.conversationId)

      // Apply filters
      if (filters.messageType) {
        query = query.eq('message_type', filters.messageType)
      }

      if (filters.direction) {
        query = query.eq('direction', filters.direction)
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate)
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate)
      }

      // Apply sorting
      const sortBy = pagination.sort_by || 'created_at'
      const sortOrder = pagination.sort || 'asc'
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })

      // Apply pagination
      if (pagination.page && pagination.per_page) {
        const from = (pagination.page - 1) * pagination.per_page
        const to = from + pagination.per_page - 1
        query = query.range(from, to)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch messages: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error fetching messages:', error)
      throw error
    }
  }

  static async createMessage(
    conversationId: string,
    clinicId: string,
    messageData: {
      content?: string
      message_type: Message['message_type']
      media_url?: string
      media_caption?: string
      direction: 'inbound' | 'outbound'
      evolution_message_id?: string
      status?: Message['status']
      // New media metadata fields
      media_mime_type?: string
      media_size?: number
      media_width?: number
      media_height?: number
      media_duration?: number
      media_thumbnail?: string
      media_waveform?: string
      is_voice_note?: boolean
    },
    supabase: SupabaseClient
  ): Promise<Message> {
    try {
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          clinic_id: clinicId,
          ...messageData
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create message: ${error.message}`)
      }

      // Update conversation with last message info
      const updates = {
        last_message_at: message.created_at,
        last_message_preview: messageData.content || `[${messageData.message_type}]`,
        updated_at: new Date().toISOString()
      }

      await supabase
        .from('conversations')
        .update(updates)
        .eq('id', conversationId)

      // If inbound message, increment unread count
      if (messageData.direction === 'inbound') {
        await supabase.rpc('increment_unread_count', { conversation_id: conversationId })
      }

      return message
    } catch (error) {
      console.error('Error creating message:', error)
      throw error
    }
  }

  static async updateMessageStatus(
    messageId: string,
    status: Message['status'],
    supabase: SupabaseClient
  ): Promise<void> {
    try {
      const updates: any = { status }
      
      if (status === 'read') {
        updates.read_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('messages')
        .update(updates)
        .eq('id', messageId)

      if (error) {
        throw new Error(`Failed to update message status: ${error.message}`)
      }
    } catch (error) {
      console.error('Error updating message status:', error)
      throw error
    }
  }

  // WhatsApp Contact Management
  static async findOrCreateContact(
    clinicId: string,
    phone: string,
    contactData: {
      name?: string
      push_name?: string
      profile_picture_url?: string
    },
    supabase: SupabaseClient
  ): Promise<WhatsAppContact> {
    try {
      // Try to find existing contact
      const { data: existing, error: findError } = await supabase
        .from('whatsapp_contacts')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('phone', phone)
        .single()

      if (existing && !findError) {
        // Update contact info if provided
        if (contactData.name || contactData.push_name || contactData.profile_picture_url) {
          const { data: updated, error: updateError } = await supabase
            .from('whatsapp_contacts')
            .update({
              ...contactData,
              last_seen: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select()
            .single()

          if (updateError) {
            throw new Error(`Failed to update contact: ${updateError.message}`)
          }

          return updated
        }

        return existing
      }

      // Create new contact
      const { data, error } = await supabase
        .from('whatsapp_contacts')
        .insert({
          clinic_id: clinicId,
          phone,
          ...contactData,
          last_seen: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create contact: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error finding/creating contact:', error)
      throw error
    }
  }

  // Statistics
  static async getChatStats(clinicId: string, supabase: SupabaseClient): Promise<ChatStats> {
    try {
      const { data, error } = await supabase
        .from('chat_stats')
        .select('*')
        .eq('clinic_id', clinicId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            clinic_id: clinicId,
            total_conversations: 0,
            active_conversations: 0,
            total_unread: 0,
            conversations_24h: 0
          }
        }
        throw new Error(`Failed to fetch chat stats: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error fetching chat stats:', error)
      throw error
    }
  }

  // Utility methods
  static async linkPatientToConversation(
    conversationId: string,
    patientId: string,
    supabase: SupabaseClient
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({
          patient_id: patientId,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)

      if (error) {
        throw new Error(`Failed to link patient to conversation: ${error.message}`)
      }
    } catch (error) {
      console.error('Error linking patient to conversation:', error)
      throw error
    }
  }

  static async searchConversations(
    clinicId: string,
    query: string,
    supabase: SupabaseClient
  ): Promise<ConversationWithPatient[]> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          patient:patients(id, name, phone, email)
        `)
        .eq('clinic_id', clinicId)
        .or(`patient_name.ilike.%${query}%,patient_phone.ilike.%${query}%`)
        .order('last_message_at', { ascending: false })
        .limit(20)

      if (error) {
        throw new Error(`Failed to search conversations: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error searching conversations:', error)
      throw error
    }
  }
}