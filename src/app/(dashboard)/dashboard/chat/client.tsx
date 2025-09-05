// Chat page client component
// Main chat interface with real-time messaging

'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  MessageSquare, 
  Settings,
  Smartphone,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { ConversationList } from '@/features/chat/components/conversation-list'
import { ChatWindow } from '@/features/chat/components/chat-window'
import { NewConversationDialog } from '@/features/chat/components/new-conversation-dialog'
import { useRealtimeMessages } from '@/features/chat/hooks/useRealtimeMessages'
import { ChatService } from '@/features/chat/services/chat.service'
import { EvolutionService } from '@/features/chat/services/evolution.service'
import { 
  ConversationWithPatient,
  WhatsAppConnection,
  ChatStats,
  Message
} from '@/features/chat/types/chat.types'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Clinic {
  id: string
  name: string
}

interface ChatPageClientProps {
  clinic: Clinic
  connection: WhatsAppConnection | null
  initialConversations: ConversationWithPatient[]
  stats: ChatStats | null
}

export function ChatPageClient({ 
  clinic, 
  connection, 
  initialConversations,
  stats
}: ChatPageClientProps) {
  const [conversations, setConversations] = useState<ConversationWithPatient[]>(initialConversations)
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithPatient | null>(null)
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [processingMedia, setProcessingMedia] = useState(false)
  const [newConversationOpen, setNewConversationOpen] = useState(false)

  const supabase = useMemo(() => createClient(), [])

  // Update conversation ID when selection changes
  useEffect(() => {
    setSelectedConversationId(selectedConversation?.id)
  }, [selectedConversation?.id])

  // Real-time messages for selected conversation
  const { messages, loading: messagesLoading, addMessage } = useRealtimeMessages({
    conversationId: selectedConversationId,
    clinicId: clinic.id,
    onNewMessage: (message) => {
      // Update conversation preview and unread count
      setConversations(prev => 
        prev.map(conv => {
          if (conv.id === message.conversation_id && message.direction === 'inbound') {
            return {
              ...conv,
              last_message_at: message.created_at,
              last_message_preview: message.content || `[${message.message_type}]`,
              unread_count: selectedConversationId === conv.id ? conv.unread_count : conv.unread_count + 1
            }
          }
          return conv
        })
      )
    }
  })

  // Real-time conversations updates
  useEffect(() => {
    console.log('🔄 Setting up real-time subscription for conversations:', {
      clinicId: clinic.id,
      timestamp: new Date().toLocaleTimeString()
    })
    
    const channel = supabase
      .channel(`conversations_${clinic.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `clinic_id=eq.${clinic.id}`,
        },
        (payload) => {
          console.log('📨 Real-time conversation event:', {
            eventType: payload.eventType,
            conversationId: payload.new?.id || payload.old?.id,
            phone: payload.new?.patient_phone || payload.old?.patient_phone,
            status: payload.new?.status || payload.old?.status,
            timestamp: new Date().toLocaleTimeString()
          })
          
          if (payload.eventType === 'INSERT') {
            console.log('➕ Adding new conversation via real-time:', payload.new)
            setConversations(prev => [payload.new as ConversationWithPatient, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setConversations(prev =>
              prev.map(conv =>
                conv.id === payload.new.id
                  ? { ...conv, ...payload.new }
                  : conv
              )
            )
            
            // Update selected conversation if it's the same
            if (selectedConversation?.id === payload.new.id) {
              setSelectedConversation(prev => prev ? { ...prev, ...payload.new } : null)
            }
          } else if (payload.eventType === 'DELETE') {
            setConversations(prev => prev.filter(conv => conv.id !== payload.old.id))
            if (selectedConversation?.id === payload.old.id) {
              setSelectedConversation(null)
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📊 Subscription status:', {
          status,
          channel: `conversations_${clinic.id}`,
          timestamp: new Date().toLocaleTimeString()
        })
      })

    return () => {
      console.log('🔄 Cleaning up conversation subscription')
      supabase.removeChannel(channel)
    }
  }, [clinic.id, selectedConversation?.id, supabase])

  const handleSendMessage = async (content: string, type: 'text'): Promise<void> => {
    if (!selectedConversation || !connection) {
      throw new Error('Conversa ou conexão não encontrada')
    }

    setSending(true)
    setError(null)

    try {
      // Send message via Evolution API
      const phone = EvolutionService.formatPhoneNumber(selectedConversation.patient_phone)
      
      await EvolutionService.sendTextMessage(connection.instance_name, {
        number: phone,
        message: content
      })

      // Save message to database
      const newMessage = await ChatService.createMessage(
        selectedConversation.id,
        clinic.id,
        {
          content,
          message_type: type,
          direction: 'outbound',
          status: 'sent'
        },
        supabase
      )

      // Add message to local state immediately (optimistic update)
      addMessage(newMessage)

    } catch (err) {
      console.error('Error sending message:', err)
      setError('Erro ao enviar mensagem. Tente novamente.')
      throw err
    } finally {
      setSending(false)
    }
  }

  const handleToggleAssistant = async (conversationId: string, enabled: boolean): Promise<void> => {
    try {
      // Optimistic update
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, ai_assistant_enabled: enabled }
            : conv
        )
      )

      // Update selected conversation if it's the one being changed
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(prev => 
          prev ? { ...prev, ai_assistant_enabled: enabled } : null
        )
      }

      // Update in database
      await ChatService.updateAssistantStatus(conversationId, enabled, supabase)
      
      toast.success(
        enabled 
          ? 'Assistente AI ativado para esta conversa'
          : 'Assistente AI desativado para esta conversa'
      )
      
    } catch (error) {
      console.error('Error toggling AI assistant:', error)
      toast.error('Erro ao atualizar assistente AI')
      
      // Revert optimistic update on error
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, ai_assistant_enabled: !enabled }
            : conv
        )
      )

      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(prev => 
          prev ? { ...prev, ai_assistant_enabled: !enabled } : null
        )
      }
    }
  }

  const handleMarkAsRead = async (conversationId: string): Promise<void> => {
    try {
      await ChatService.markConversationAsRead(conversationId, supabase)
      
      // Update local state
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, unread_count: 0 }
            : conv
        )
      )
    } catch (err) {
      console.error('Error marking conversation as read:', err)
    }
  }

  const handleArchiveConversation = async (conversationId: string): Promise<void> => {
    try {
      const conversation = conversations.find(c => c.id === conversationId)
      if (!conversation) return

      const newStatus = conversation.status === 'archived' ? 'active' : 'archived'
      
      await ChatService.updateConversation(
        conversationId,
        { status: newStatus },
        supabase
      )

      // If archived conversation was selected, clear selection
      if (newStatus === 'archived' && selectedConversation?.id === conversationId) {
        setSelectedConversation(null)
      }
    } catch (err) {
      console.error('Error archiving conversation:', err)
      setError('Erro ao arquivar conversa. Tente novamente.')
    }
  }

  const handleDeleteConversation = async (conversationId: string): Promise<void> => {
    try {
      await ChatService.deleteConversation(conversationId, supabase)
      
      // Remove da lista local
      setConversations(prev => prev.filter(c => c.id !== conversationId))
      
      // Limpa seleção se for a conversa excluída
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null)
      }
    } catch (err) {
      console.error('Error deleting conversation:', err)
      setError('Erro ao excluir conversa. Tente novamente.')
    }
  }

  const handleLinkPatient = (conversationId: string) => {
    // TODO: Implement patient linking modal
    console.log('Link patient to conversation:', conversationId)
  }

  const handleNewConversationCreated = (conversation: ConversationWithPatient) => {
    // Add new conversation to the list
    setConversations(prev => [conversation, ...prev])
    
    // Select the new conversation
    setSelectedConversation(conversation)
    
    // Close the dialog
    setNewConversationOpen(false)
  }

  const handleRefreshConversations = async () => {
    setRefreshing(true)
    try {
      const { data: freshConversations } = await supabase
        .from('conversations')
        .select(`
          *,
          patient:patients(id, name, phone, email)
        `)
        .eq('clinic_id', clinic.id)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(50)

      if (freshConversations) {
        setConversations(freshConversations)
        console.log('🔄 Refreshed conversations:', {
          count: freshConversations.length,
          conversations: freshConversations.map(c => ({
            id: c.id,
            phone: c.patient_phone,
            name: c.patient_name,
            status: c.status,
            lastMessage: c.last_message_at
          }))
        })
      }
    } catch (err) {
      console.error('Error refreshing conversations:', err)
      setError('Erro ao atualizar conversas')
    } finally {
      setRefreshing(false)
    }
  }

  const handleProcessMediaQueue = async () => {
    setProcessingMedia(true)
    try {
      const response = await fetch('/api/chat/process-media-queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process media queue')
      }

      console.log('📦 Media queue processed:', result)
      
      // If some media was processed, refresh conversations to see updates
      if (result.processed > 0) {
        await handleRefreshConversations()
      }
      
      setError(null)
      
    } catch (err) {
      console.error('Error processing media queue:', err)
      setError('Erro ao processar fila de mídia')
    } finally {
      setProcessingMedia(false)
    }
  }

  // Check if WhatsApp is connected
  const isConnected = connection?.status === 'connected'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Chat WhatsApp</h1>
          <p className="text-gray-600 mt-2">
            Comunicação em tempo real com pacientes
          </p>
        </div>

        <div className="flex gap-2">
          {isConnected && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshConversations}
                disabled={refreshing}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
                {refreshing ? 'Atualizando...' : 'Atualizar'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleProcessMediaQueue}
                disabled={processingMedia}
              >
                <Loader2 className={cn("h-4 w-4 mr-2", processingMedia && "animate-spin")} />
                {processingMedia ? 'Processando...' : 'Processar Mídia'}
              </Button>
            </>
          )}
          
          {!connection && (
            <Link href="/dashboard/configuracoes/whatsapp">
              <Button>
                <Settings className="h-4 w-4 mr-2" />
                Configurar WhatsApp
              </Button>
            </Link>
          )}
        </div>
      </div>


      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* WhatsApp not configured warning */}
      {!connection && (
        <Alert>
          <Smartphone className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              WhatsApp não configurado. Configure a integração para começar a receber mensagens.
            </span>
            <Link href="/dashboard/configuracoes/whatsapp">
              <Button size="sm" variant="outline">
                Configurar
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* WhatsApp not connected warning */}
      {connection && !isConnected && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              WhatsApp desconectado. Verifique sua conexão ou configure novamente.
            </span>
            <Link href="/dashboard/configuracoes/whatsapp">
              <Button size="sm" variant="outline">
                Verificar
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Chat Interface */}
      {isConnected ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-250px)]">
          {/* Conversations List */}
          <div className="lg:col-span-1 h-full overflow-hidden">
            <ConversationList
              conversations={conversations}
              selectedConversation={selectedConversation}
              onSelectConversation={(conversation) => {
                setSelectedConversation(conversation)
                // Auto-mark as read when selecting conversation with unread messages
                if (conversation.unread_count > 0) {
                  handleMarkAsRead(conversation.id)
                }
              }}
              onArchiveConversation={handleArchiveConversation}
              onLinkPatient={handleLinkPatient}
              onMarkAsRead={handleMarkAsRead}
              onDeleteConversation={handleDeleteConversation}
              onNewConversation={() => setNewConversationOpen(true)}
              loading={loading}
            />
          </div>

          {/* Chat Window */}
          <div className="lg:col-span-3 h-full overflow-hidden">
            <ChatWindow
              conversation={selectedConversation}
              messages={messages}
              onSendMessage={handleSendMessage}
              onMarkAsRead={handleMarkAsRead}
              onArchiveConversation={handleArchiveConversation}
              onLinkPatient={handleLinkPatient}
              onToggleAssistant={handleToggleAssistant}
              loading={messagesLoading || sending}
            />
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Sistema de Chat WhatsApp</CardTitle>
            <CardDescription>
              Configure a integração WhatsApp para começar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="font-medium text-lg mb-2">Configure o WhatsApp</h3>
              <p className="text-muted-foreground mb-6">
                Conecte seu WhatsApp para começar a conversar com seus pacientes
              </p>
              <Link href="/dashboard/configuracoes/whatsapp">
                <Button>
                  <Smartphone className="h-4 w-4 mr-2" />
                  Configurar WhatsApp
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Conversation Dialog */}
      <NewConversationDialog
        open={newConversationOpen}
        onOpenChange={setNewConversationOpen}
        clinicId={clinic.id}
        onConversationCreated={handleNewConversationCreated}
      />
    </div>
  )
}