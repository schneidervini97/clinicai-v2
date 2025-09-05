// Chat window component
// Main chat interface with messages and input

'use client'

import { useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  User, 
  Phone, 
  MoreVertical,
  Archive,
  UserPlus,
  MessageSquare,
  Bot
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ConversationWithPatient, Message } from '../types/chat.types'
import { MessageBubble } from './message-bubble'
import { MessageInput } from './message-input'
import { cn } from '@/lib/utils'

interface ChatWindowProps {
  conversation?: ConversationWithPatient | null
  messages: Message[]
  onSendMessage: (content: string, type: 'text') => Promise<void>
  onMarkAsRead?: (conversationId: string) => void
  onArchiveConversation?: (conversationId: string) => void
  onLinkPatient?: (conversationId: string) => void
  onToggleAssistant?: (conversationId: string, enabled: boolean) => Promise<void>
  loading?: boolean
  className?: string
}

export function ChatWindow({
  conversation,
  messages,
  onSendMessage,
  onMarkAsRead,
  onArchiveConversation,
  onLinkPatient,
  onToggleAssistant,
  loading = false,
  className
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      })
    }
  }, [messages])

  // Mark conversation as read when opened
  useEffect(() => {
    if (conversation?.id && conversation.unread_count > 0 && onMarkAsRead) {
      const timer = setTimeout(() => {
        onMarkAsRead(conversation.id)
      }, 1000) // Mark as read after 1 second

      return () => clearTimeout(timer)
    }
  }, [conversation?.id, conversation?.unread_count, onMarkAsRead])

  if (!conversation) {
    return (
      <Card className={cn("flex flex-col h-full", className)}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="font-medium text-lg mb-2">Selecione uma conversa</h3>
            <p className="text-muted-foreground">
              Escolha uma conversa na lista ao lado para começar a conversar
            </p>
          </div>
        </div>
      </Card>
    )
  }

  const displayName = conversation.patient?.name || conversation.patient_name || 'Desconhecido'
  const isPatientLinked = !!conversation.patient_id

  return (
    <Card className={cn("flex flex-col h-full overflow-hidden", className)}>
      {/* Chat header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <Avatar className="h-10 w-10">
            <AvatarFallback className={cn(
              'text-white font-semibold',
              isPatientLinked ? 'bg-green-500' : 'bg-gray-500'
            )}>
              {isPatientLinked ? (
                <User className="h-5 w-5" />
              ) : (
                <Phone className="h-5 w-5" />
              )}
            </AvatarFallback>
          </Avatar>

          {/* Contact info */}
          <div>
            <h2 className="font-semibold">{displayName}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{conversation.patient_phone}</span>
              {!isPatientLinked && (
                <Badge variant="outline" className="h-5 px-2 text-xs">
                  Não vinculado
                </Badge>
              )}
              {conversation.status === 'archived' && (
                <Badge variant="secondary" className="h-5 px-2 text-xs">
                  <Archive className="h-3 w-3 mr-1" />
                  Arquivada
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* AI Assistant Toggle */}
        <div className="flex items-center gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full border bg-muted/50">
                  <Bot className={cn(
                    "h-4 w-4",
                    conversation.ai_assistant_enabled ? "text-primary" : "text-muted-foreground"
                  )} />
                  <Switch
                    checked={conversation.ai_assistant_enabled}
                    onCheckedChange={(enabled) => {
                      if (onToggleAssistant) {
                        onToggleAssistant(conversation.id, enabled)
                      }
                    }}
                    size="sm"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {conversation.ai_assistant_enabled 
                    ? "Assistente AI ativo - Respostas automáticas habilitadas"
                    : "Assistente AI inativo - Sem respostas automáticas"
                  }
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!isPatientLinked && onLinkPatient && (
              <DropdownMenuItem onClick={() => onLinkPatient(conversation.id)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Vincular Paciente
              </DropdownMenuItem>
            )}
            {isPatientLinked && conversation.patient && (
              <DropdownMenuItem onClick={() => {
                // TODO: Navigate to patient profile
              }}>
                <User className="mr-2 h-4 w-4" />
                Ver Perfil do Paciente
              </DropdownMenuItem>
            )}
            {onArchiveConversation && (
              <DropdownMenuItem onClick={() => onArchiveConversation(conversation.id)}>
                <Archive className="mr-2 h-4 w-4" />
                {conversation.status === 'archived' ? 'Desarquivar' : 'Arquivar'}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages area */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={cn(
                'flex gap-2',
                i % 2 === 0 ? 'justify-start' : 'justify-end'
              )}>
                <div className={cn(
                  'rounded-2xl p-3 max-w-[70%] animate-pulse',
                  i % 2 === 0 ? 'bg-muted' : 'bg-primary/20'
                )}>
                  <div className="h-4 bg-current opacity-20 rounded mb-2" />
                  <div className="h-3 bg-current opacity-20 rounded w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              Nenhuma mensagem ainda. Envie a primeira mensagem!
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message, index) => {
              const prevMessage = messages[index - 1]
              const showAvatar = !prevMessage || 
                prevMessage.direction !== message.direction ||
                new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() > 5 * 60 * 1000 // 5 minutes
              
              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  showAvatar={showAvatar && message.direction === 'inbound'}
                />
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Message input */}
      <MessageInput
        onSendMessage={onSendMessage}
        disabled={conversation.status === 'archived'}
        placeholder={
          conversation.status === 'archived' 
            ? 'Conversa arquivada'
            : `Mensagem para ${displayName}...`
        }
      />

      {/* Connection status indicator */}
      {conversation.status === 'archived' && (
        <div className="p-2 bg-muted border-t text-center">
          <p className="text-sm text-muted-foreground">
            Esta conversa está arquivada. Para enviar mensagens, desarquive a conversa primeiro.
          </p>
        </div>
      )}
    </Card>
  )
}