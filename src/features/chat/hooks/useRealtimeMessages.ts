// Real-time messages hook using Supabase Realtime
// Subscribes to message updates for a specific conversation

'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Message, RealtimePayload } from '../types/chat.types'

interface UseRealtimeMessagesProps {
  conversationId?: string
  clinicId?: string
  onNewMessage?: (message: Message) => void
  onMessageUpdate?: (message: Message) => void
}

export function useRealtimeMessages({ 
  conversationId, 
  clinicId,
  onNewMessage,
  onMessageUpdate 
}: UseRealtimeMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  
  // Memoize Supabase client to prevent recreation on re-renders
  const supabase = useMemo(() => createClient(), [])
  
  // Function to add message without triggering reload
  const addMessage = useCallback((message: Message) => {
    setMessages(prev => {
      // Check for duplicates
      if (prev.some(msg => msg.id === message.id)) {
        console.log('📨 Message already exists in local state, skipping duplicate')
        return prev
      }
      
      console.log('➕ Adding message via addMessage (optimistic):', {
        id: message.id,
        content: message.content?.substring(0, 30) + '...',
        direction: message.direction,
        timestamp: new Date().toLocaleTimeString()
      })
      
      // Add and sort messages by timestamp
      const updated = [...prev, message].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      
      return updated
    })
  }, [])

  // Load initial messages only when conversation ID actually changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      setLoading(false)
      return
    }

    async function loadMessages() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })

        if (error) {
          console.error('Error loading messages:', error)
          return
        }

        console.log('🔄 useEffect triggered - Loading messages for conversation:', conversationId, 'at', new Date().toLocaleTimeString())
        setMessages(data || [])
      } catch (error) {
        console.error('Error loading messages:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMessages()
  }, [conversationId])

  // Set up real-time subscription
  useEffect(() => {
    if (!conversationId || !clinicId) return

    console.log(`🔄 Setting up real-time subscription for conversation: ${conversationId}, clinic: ${clinicId}`)

    const channel = supabase
      .channel(`messages_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: RealtimePayload<Message>) => {
          const newMessage = payload.new
          console.log('📨 New message received via real-time:', {
            id: newMessage.id,
            direction: newMessage.direction,
            content: newMessage.content,
            clinicId: newMessage.clinic_id
          })
          
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(msg => msg.id === newMessage.id)) {
              console.log('⚠️ Duplicate message ignored:', newMessage.id)
              return prev
            }
            
            const updated = [...prev, newMessage].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
            
            onNewMessage?.(newMessage)
            return updated
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: RealtimePayload<Message>) => {
          const updatedMessage = payload.new
          console.log('🔄 Message updated via real-time:', {
            id: updatedMessage.id,
            direction: updatedMessage.direction,
            status: updatedMessage.status
          })
          
          setMessages(prev => 
            prev.map(msg => 
              msg.id === updatedMessage.id ? updatedMessage : msg
            )
          )
          
          onMessageUpdate?.(updatedMessage)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, clinicId, onNewMessage, onMessageUpdate, supabase])

  return {
    messages,
    loading,
    addMessage
  }
}