// Conversation list component
// Displays list of conversations with search and filtering

'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { 
  Search, 
  MessageSquare, 
  User, 
  Phone,
  Archive,
  MoreVertical,
  Trash2,
  Plus,
  Bot
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ConversationWithPatient } from '../types/chat.types'
import { cn } from '@/lib/utils'

interface ConversationListProps {
  conversations: ConversationWithPatient[]
  selectedConversation?: ConversationWithPatient | null
  onSelectConversation: (conversation: ConversationWithPatient) => void
  onArchiveConversation?: (conversationId: string) => void
  onLinkPatient?: (conversationId: string) => void
  onMarkAsRead?: (conversationId: string) => void
  onDeleteConversation?: (conversationId: string) => void
  onNewConversation?: () => void
  loading?: boolean
  className?: string
}

export function ConversationList({
  conversations,
  selectedConversation,
  onSelectConversation,
  onArchiveConversation,
  onLinkPatient,
  onMarkAsRead,
  onDeleteConversation,
  onNewConversation,
  loading = false,
  className
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'unread' | 'archived'>('all')
  const [deleteConversationId, setDeleteConversationId] = useState<string | null>(null)

  // Filter and search conversations
  const filteredConversations = useMemo(() => {
    let filtered = conversations

    // Apply status filter
    if (filter === 'unread') {
      filtered = filtered.filter(conv => conv.unread_count > 0)
    } else if (filter === 'archived') {
      filtered = filtered.filter(conv => conv.status === 'archived')
    } else if (filter === 'all') {
      // "Todas" shows only active (non-archived) conversations
      filtered = filtered.filter(conv => conv.status === 'active' || conv.status === null || !conv.status)
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(conv =>
        conv.patient_name?.toLowerCase().includes(query) ||
        conv.patient_phone.includes(query) ||
        conv.patient?.name?.toLowerCase().includes(query)
      )
    }

    // Sort by last message date
    return filtered.sort((a, b) => {
      const aDate = new Date(a.last_message_at || a.created_at)
      const bDate = new Date(b.last_message_at || b.created_at)
      return bDate.getTime() - aDate.getTime()
    })
  }, [conversations, searchQuery, filter])

  if (loading) {
    return (
      <Card className={cn("flex flex-col h-full", className)}>
        <div className="p-4 border-b">
          <div className="h-10 bg-muted rounded-md animate-pulse mb-4" />
          <div className="flex gap-2">
            {['Todas', 'Não lidas', 'Arquivadas'].map((_, i) => (
              <div key={i} className="h-8 w-16 bg-muted rounded-md animate-pulse" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-3">
              <div className="w-12 h-12 bg-muted rounded-full animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card className={cn("flex flex-col h-full overflow-hidden", className)}>
      {/* Header with search and filters */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversas
          </h2>
          {onNewConversation && (
            <Button
              size="sm"
              onClick={onNewConversation}
              className="h-8 gap-2"
            >
              <Plus className="h-4 w-4" />
              Nova Conversa
            </Button>
          )}
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1">
          {[
            { key: 'all', label: 'Todas', count: conversations.filter(c => c.status === 'active').length },
            { key: 'unread', label: 'Não lidas', count: conversations.filter(c => c.unread_count > 0).length },
            { key: 'archived', label: 'Arquivadas', count: conversations.filter(c => c.status === 'archived').length }
          ].map(({ key, label, count }) => (
            <Button
              key={key}
              variant={filter === key ? 'default' : 'ghost'}
              size="sm"
              className="h-8 gap-2"
              onClick={() => setFilter(key as 'all' | 'unread' | 'archived')}
            >
              {label}
              {count > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {count}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isSelected={selectedConversation?.id === conversation.id}
                  onClick={() => onSelectConversation(conversation)}
                  onArchive={onArchiveConversation}
                  onLinkPatient={onLinkPatient}
                  onMarkAsRead={onMarkAsRead}
                  onDelete={() => setDeleteConversationId(conversation.id)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer with stats */}
      <div className="p-3 border-t text-xs text-muted-foreground text-center">
        {filteredConversations.length} de {conversations.length} conversas
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConversationId} onOpenChange={() => setDeleteConversationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conversa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta conversa? 
              Todas as mensagens serão permanentemente removidas. 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConversationId && onDeleteConversation) {
                  onDeleteConversation(deleteConversationId)
                  setDeleteConversationId(null)
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

interface ConversationItemProps {
  conversation: ConversationWithPatient
  isSelected: boolean
  onClick: () => void
  onArchive?: (conversationId: string) => void
  onLinkPatient?: (conversationId: string) => void
  onMarkAsRead?: (conversationId: string) => void
  onDelete?: () => void
}

function ConversationItem({ 
  conversation, 
  isSelected, 
  onClick,
  onArchive,
  onLinkPatient,
  onMarkAsRead,
  onDelete
}: ConversationItemProps) {
  const displayName = conversation.patient?.name || conversation.patient_name || 'Desconhecido'
  const displayPhone = conversation.patient_phone
  const isPatientLinked = !!conversation.patient_id
  
  const lastMessageTime = conversation.last_message_at 
    ? new Date(conversation.last_message_at).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    : ''

  return (
    <div
      className={cn(
        'group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/50',
        isSelected && 'bg-primary/10 border border-primary/20',
        conversation.status === 'archived' && 'opacity-60 bg-muted/20'
      )}
      onClick={onClick}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold',
          isPatientLinked ? 'bg-green-500' : 'bg-gray-500',
          conversation.status === 'archived' && 'bg-gray-400'
        )}>
          {isPatientLinked ? (
            <User className="h-6 w-6" />
          ) : (
            <Phone className="h-6 w-6" />
          )}
        </div>

        {/* Unread indicator */}
        {conversation.unread_count > 0 && (
          <Badge 
            className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-xs bg-red-500 hover:bg-red-500"
          >
            {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-medium truncate">
            {displayName}
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {lastMessageTime}
            {conversation.status === 'archived' && (
              <Archive className="h-3 w-3" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <p className="text-sm text-muted-foreground truncate flex-1">
            {conversation.last_message_preview || 'Nova conversa'}
          </p>
          {conversation.ai_assistant_enabled && (
            <div className="flex-shrink-0">
              <Bot className="h-3 w-3 text-primary" />
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground mt-1">
          {displayPhone}
          {!isPatientLinked && (
            <Badge variant="outline" className="ml-2 h-4 px-1 text-xs">
              Não vinculado
            </Badge>
          )}
          {conversation.status === 'archived' && (
            <Badge variant="secondary" className="ml-2 h-4 px-1 text-xs bg-gray-100">
              Arquivada
            </Badge>
          )}
        </div>
      </div>

      {/* Actions menu */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {conversation.unread_count > 0 && onMarkAsRead && (
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation()
                  onMarkAsRead(conversation.id)
                }}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Marcar como lida
              </DropdownMenuItem>
            )}
            {!isPatientLinked && onLinkPatient && (
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation()
                  onLinkPatient(conversation.id)
                }}
              >
                <User className="mr-2 h-4 w-4" />
                Vincular Paciente
              </DropdownMenuItem>
            )}
            {onArchive && (
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation()
                  onArchive(conversation.id)
                }}
              >
                <Archive className="mr-2 h-4 w-4" />
                {conversation.status === 'archived' ? 'Desarquivar' : 'Arquivar'}
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                  }}
                  className="text-red-600 hover:text-red-700 focus:text-red-700"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir Conversa
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}