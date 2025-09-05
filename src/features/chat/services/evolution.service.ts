// Evolution API service for WhatsApp integration
// Handles all communication with Evolution API v2.3.1

import { 
  EvolutionInstance, 
  CreateInstanceRequest, 
  SendMessageRequest,
  SendMediaRequest,
  WebhookConfigRequest,
  EvolutionContact
} from '../types/chat.types'

export class EvolutionService {
  private static baseUrl: string = '/api/evolution'

  private static async request<T = any>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error(`Evolution API proxy error: ${response.status} ${response.statusText}`, errorData)
      throw new Error(`Evolution API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Instance Management
  static async createInstance(data: CreateInstanceRequest): Promise<EvolutionInstance> {
    return this.request<EvolutionInstance>('/instance/create', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  static async deleteInstance(instanceName: string): Promise<void> {
    return this.request(`/instance/delete/${instanceName}`, {
      method: 'DELETE',
    })
  }

  static async fetchInstances(): Promise<EvolutionInstance[]> {
    return this.request<EvolutionInstance[]>('/instance/fetchInstances')
  }

  static async getConnectionState(instanceName: string): Promise<{
    instance: {
      instanceName: string
      state: 'close' | 'connecting' | 'open'
    }
  }> {
    return this.request(`/instance/connectionState/${instanceName}`)
  }

  static async restartInstance(instanceName: string): Promise<{
    instance: {
      instanceName: string
      status: string
    }
  }> {
    return this.request(`/instance/restart/${instanceName}`, {
      method: 'POST',
    })
  }

  static async logoutInstance(instanceName: string): Promise<void> {
    return this.request(`/instance/logout/${instanceName}`, {
      method: 'DELETE',
    })
  }

  static async getInstanceStatus(instanceName: string): Promise<EvolutionInstance | null> {
    try {
      const instances = await this.fetchInstances()
      return instances.find(instance => instance.instanceName === instanceName) || null
    } catch (error) {
      console.error('Error fetching instance status:', error)
      return null
    }
  }

  // Health Check and Verification Methods
  static async checkInstanceExists(instanceName: string): Promise<{
    exists: boolean
    status?: 'close' | 'connecting' | 'open'
    error?: string
  }> {
    try {
      // Try to get connection state first (lighter call)
      const result = await this.getConnectionState(instanceName)
      
      if (result && result.instance) {
        return {
          exists: true,
          status: result.instance.state
        }
      }
      
      return { exists: false, error: 'Instance not found' }
    } catch (error: any) {
      console.log('Instance existence check failed:', error.message)
      
      // Check if it's a 404 error (instance doesn't exist)
      if (error.message.includes('404') || error.message.includes('not found')) {
        return { 
          exists: false, 
          error: 'Instance not found in Evolution API' 
        }
      }
      
      // For other errors, we can't determine existence
      return { 
        exists: false, 
        error: `Unable to verify instance existence: ${error.message}` 
      }
    }
  }

  static async pingInstance(instanceName: string): Promise<{
    healthy: boolean
    responseTime?: number
    error?: string
  }> {
    const startTime = Date.now()
    
    try {
      // Use a lightweight endpoint to check if instance is responsive
      await this.getConnectionState(instanceName)
      const responseTime = Date.now() - startTime
      
      return {
        healthy: true,
        responseTime
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime
      
      return {
        healthy: false,
        responseTime,
        error: error.message
      }
    }
  }

  static async connectInstance(instanceName: string): Promise<{
    pairingCode?: string | null
    code?: string
    base64?: string
    count?: number
  }> {
    return this.request(`/instance/connect/${instanceName}`)
  }

  // Smart Reconnection Method
  static async reconnectInstance(instanceName: string): Promise<{
    success: boolean
    qrResult?: {
      pairingCode?: string | null
      code?: string
      base64?: string
      count?: number
    }
    error?: string
  }> {
    try {
      console.log('🔄 Starting smart reconnection for instance:', instanceName)
      
      // Step 1: Check if instance exists
      const existsCheck = await this.checkInstanceExists(instanceName)
      
      if (!existsCheck.exists) {
        return {
          success: false,
          error: 'Instance not found - needs to be recreated'
        }
      }
      
      // Step 2: Force logout to clear any existing session
      try {
        await this.logoutInstance(instanceName)
        console.log('📤 Instance logged out successfully')
      } catch (logoutError) {
        console.log('⚠️ Logout error (might be expected):', logoutError)
        // Continue - logout might fail if already disconnected
      }
      
      // Step 3: Wait a moment for logout to process
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Step 4: Request new QR Code
      const qrResult = await this.connectInstance(instanceName)
      console.log('📱 New QR Code requested successfully')
      
      return {
        success: true,
        qrResult
      }
      
    } catch (error: any) {
      console.error('❌ Reconnection failed:', error.message)
      
      return {
        success: false,
        error: `Reconnection failed: ${error.message}`
      }
    }
  }

  // Force Instance Recreation (when instance doesn't exist)
  static async recreateInstance(
    instanceName: string, 
    webhookUrl: string,
    originalConfig?: CreateInstanceRequest
  ): Promise<{
    success: boolean
    instance?: EvolutionInstance
    qrResult?: {
      pairingCode?: string | null
      code?: string
      base64?: string
      count?: number
    }
    error?: string
  }> {
    try {
      console.log('🆕 Starting instance recreation for:', instanceName)
      
      // Step 1: Try to delete existing instance (if any)
      try {
        await this.deleteInstance(instanceName)
        console.log('🗑️ Existing instance deleted')
        
        // Wait for deletion to complete
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (deleteError) {
        console.log('⚠️ Delete error (might be expected if instance already gone):', deleteError)
      }
      
      // Step 2: Create new instance with default config
      const createConfig: CreateInstanceRequest = originalConfig || {
        instanceName,
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true,
        rejectCall: true,
        groupsIgnore: true,
        readMessages: false,
        readStatus: true,
        syncFullHistory: false,
        webhook: {
          url: webhookUrl,
          byEvents: false,
          base64: true,
          events: [
            'MESSAGES_UPSERT',
            'MESSAGES_UPDATE', 
            'CONNECTION_UPDATE',
            'QRCODE_UPDATED',
            'SEND_MESSAGE'
          ]
        }
      }
      
      const instance = await this.createInstance(createConfig)
      console.log('✅ New instance created successfully')
      
      // Step 3: Wait a moment then request QR Code
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const qrResult = await this.connectInstance(instanceName)
      console.log('📱 QR Code generated for new instance')
      
      return {
        success: true,
        instance,
        qrResult
      }
      
    } catch (error: any) {
      console.error('❌ Instance recreation failed:', error.message)
      
      return {
        success: false,
        error: `Recreation failed: ${error.message}`
      }
    }
  }

  // Webhook Configuration
  static async setWebhook(instanceName: string, data: WebhookConfigRequest): Promise<{
    webhook: {
      instanceName: string
      webhook: {
        url: string
        events: string[]
        enabled: boolean
      }
    }
  }> {
    return this.request(`/webhook/set/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  static async configureWebhook(instanceName: string, baseUrl: string): Promise<{
    webhook: {
      instanceName: string
      webhook: {
        url: string
        events: string[]
        enabled: boolean
      }
    }
  }> {
    const webhookUrl = `${baseUrl}/api/webhooks/evolution`
    
    return this.setWebhook(instanceName, {
      url: webhookUrl,
      webhook_by_events: false,
      webhook_base64: true,
      events: [
        'QRCODE_UPDATED',
        'CONNECTION_UPDATE', 
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE',
        'SEND_MESSAGE'
      ]
    })
  }

  static async getWebhook(instanceName: string): Promise<{
    enabled: boolean
    url: string
    events: string[]
  }> {
    return this.request(`/webhook/find/${instanceName}`)
  }

  // Message Sending
  static async sendTextMessage(instanceName: string, data: SendMessageRequest): Promise<{
    key: {
      remoteJid: string
      fromMe: boolean
      id: string
    }
    message: any
    messageTimestamp: number
    status: string
  }> {
    return this.request(`/message/sendText/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        number: data.number,
        text: data.message,
        options: {
          delay: 1200,
          presence: 'composing'
        }
      }),
    })
  }

  static async sendMediaMessage(instanceName: string, data: SendMediaRequest): Promise<{
    key: {
      remoteJid: string
      fromMe: boolean
      id: string
    }
    message: any
    messageTimestamp: number
    status: string
  }> {
    return this.request(`/message/sendMedia/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        number: data.number,
        options: {
          delay: 1200,
          presence: 'composing'
        },
        mediaMessage: {
          mediaUrl: data.mediaUrl,
          caption: data.caption,
          fileName: data.fileName
        }
      }),
    })
  }

  static async sendAudioMessage(instanceName: string, number: string, audioUrl: string): Promise<any> {
    return this.request(`/message/sendWhatsAppAudio/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        number,
        options: {
          delay: 1200,
          presence: 'recording'
        },
        audioMessage: {
          audio: audioUrl
        }
      }),
    })
  }

  static async sendLocationMessage(instanceName: string, number: string, latitude: number, longitude: number, name?: string, address?: string): Promise<any> {
    return this.request(`/message/sendLocation/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        number,
        options: {
          delay: 1200
        },
        locationMessage: {
          latitude,
          longitude,
          name,
          address
        }
      }),
    })
  }

  // Chat Management
  static async markAsRead(instanceName: string, chatId: string): Promise<void> {
    return this.request(`/chat/markMessageAsRead/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        read_messages: [
          {
            remoteJid: chatId,
            fromMe: false,
            id: 'all'
          }
        ]
      }),
    })
  }

  static async checkIsWhatsApp(instanceName: string, numbers: string[]): Promise<{
    exists: boolean
    number: string
    jid: string
  }[]> {
    return this.request(`/chat/whatsappNumbers/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        numbers
      }),
    })
  }

  static async fetchMessages(instanceName: string, chatId: string, limit: number = 100): Promise<any[]> {
    return this.request(`/chat/findMessages/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        where: {
          owner: chatId
        },
        limit
      }),
    })
  }

  static async fetchContacts(instanceName: string): Promise<EvolutionContact[]> {
    return this.request(`/chat/findContacts/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
  }

  static async fetchChats(instanceName: string): Promise<any[]> {
    return this.request(`/chat/findChats/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
  }

  static async getBase64FromMediaMessage(instanceName: string, messageKey: { id: string }, convertToMp4: boolean = false): Promise<{
    media: string
    mimetype: string
    fileName: string
  }> {
    return this.request(`/chat/getBase64FromMediaMessage/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        message: {
          key: messageKey
        },
        convertToMp4
      }),
    })
  }

  static async fetchProfilePicUrl(instanceName: string, number: string): Promise<{
    profilePictureUrl: string
  }> {
    return this.request(`/chat/fetchProfilePictureUrl/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        number
      }),
    })
  }

  static async archiveChat(instanceName: string, chatId: string, archive: boolean = true): Promise<void> {
    return this.request(`/chat/archiveChat/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        chat: chatId,
        archive
      }),
    })
  }

  static async deleteMessage(instanceName: string, chatId: string, messageId: string, forEveryone: boolean = true): Promise<void> {
    return this.request(`/chat/deleteMessage/${instanceName}`, {
      method: 'DELETE',
      body: JSON.stringify({
        id: messageId,
        remoteJid: chatId,
        fromMe: true,
        participant: forEveryone ? undefined : chatId
      }),
    })
  }

  // Presence Management
  static async sendPresence(instanceName: string, number: string, presence: 'available' | 'composing' | 'recording' | 'paused'): Promise<void> {
    return this.request(`/chat/sendPresence/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        number,
        presence
      }),
    })
  }

  static async setPresence(instanceName: string, presence: 'available' | 'unavailable'): Promise<void> {
    return this.request(`/instance/setPresence/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        presence
      }),
    })
  }

  // Settings Management
  static async updateSettings(instanceName: string, settings: {
    reject_call?: boolean
    groups_ignore?: boolean
    always_online?: boolean
    read_messages?: boolean
    read_status?: boolean
    sync_full_history?: boolean
  }): Promise<void> {
    return this.request(`/settings/set/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify(settings),
    })
  }

  static async getSettings(instanceName: string): Promise<{
    reject_call: boolean
    groups_ignore: boolean
    always_online: boolean
    read_messages: boolean
    read_status: boolean
    sync_full_history: boolean
  }> {
    return this.request(`/settings/find/${instanceName}`)
  }

  // Utility methods
  static formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '')
    
    // Add country code if not present
    if (!cleaned.startsWith('55')) {
      cleaned = '55' + cleaned
    }
    
    // Add @s.whatsapp.net suffix
    return cleaned + '@s.whatsapp.net'
  }

  static extractPhoneFromJid(jid: string): string {
    if (!jid || typeof jid !== 'string') {
      return ''
    }
    return jid.replace('@s.whatsapp.net', '').replace('@c.us', '')
  }

  static isGroupJid(jid: string): boolean {
    if (!jid || typeof jid !== 'string') {
      return false
    }
    return jid.includes('@g.us')
  }

  // Health check
  static async getApiInfo(): Promise<{
    version: string
    environment: string
    status: string
  }> {
    return this.request('/information')
  }
}