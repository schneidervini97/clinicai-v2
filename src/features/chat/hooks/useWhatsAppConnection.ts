// WhatsApp connection management hook
// Handles connection status, QR code, and real-time updates

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WhatsAppConnection, RealtimePayload } from '../types/chat.types'

interface UseWhatsAppConnectionProps {
  clinicId: string
}

export function useWhatsAppConnection({ clinicId }: UseWhatsAppConnectionProps) {
  const [connection, setConnection] = useState<WhatsAppConnection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Load connection
  useEffect(() => {
    if (!clinicId) return

    async function loadConnection() {
      setLoading(true)
      setError(null)

      try {
        const { data, error } = await supabase
          .from('whatsapp_connections')
          .select('*')
          .eq('clinic_id', clinicId)
          .single()

        if (error && error.code !== 'PGRST116') {
          throw error
        }

        setConnection(data)
      } catch (err) {
        console.error('Error loading WhatsApp connection:', err)
        setError('Erro ao carregar conexão WhatsApp')
      } finally {
        setLoading(false)
      }
    }

    loadConnection()
  }, [clinicId, supabase])

  // Set up real-time subscription for connection updates
  useEffect(() => {
    if (!clinicId) return

    console.log('Setting up real-time subscription for clinic:', clinicId)

    const channel = supabase
      .channel(`whatsapp_connection_${clinicId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_connections',
          filter: `clinic_id=eq.${clinicId}`,
        },
        (payload: RealtimePayload<WhatsAppConnection>) => {
          console.log('🔄 Real-time update received:', {
            eventType: payload.eventType,
            schema: payload.schema,
            table: payload.table,
            newStatus: payload.new?.status,
            hasQRCode: !!payload.new?.qr_code,
            qrCodeLength: payload.new?.qr_code?.length,
            fullPayload: JSON.stringify(payload, null, 2)
          })
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            console.log('🔄 Updating connection state with new data')
            setConnection(payload.new)
            
            // Force UI update by clearing any error states
            setError(null)
          } else if (payload.eventType === 'DELETE') {
            console.log('🗑️ Removing connection due to DELETE event')
            setConnection(null)
            setError(null)
          }
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time is working!')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time subscription failed')
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ Real-time subscription timed out')
        } else if (status === 'CLOSED') {
          console.warn('🔒 Real-time subscription closed')
        }
      })

    return () => {
      console.log('Cleaning up real-time subscription')
      supabase.removeChannel(channel)
    }
  }, [clinicId, supabase])

  // Create new connection
  const createConnection = async (instanceName: string, webhookUrl: string): Promise<WhatsAppConnection> => {
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
        throw error
      }

      setConnection(data)
      return data
    } catch (err) {
      console.error('Error creating WhatsApp connection:', err)
      throw new Error('Erro ao criar conexão WhatsApp')
    }
  }

  // Update connection
  const updateConnection = async (updates: Partial<WhatsAppConnection>): Promise<void> => {
    if (!connection) {
      throw new Error('Nenhuma conexão encontrada')
    }

    try {
      const { error } = await supabase
        .from('whatsapp_connections')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', connection.id)

      if (error) {
        throw error
      }
    } catch (err) {
      console.error('Error updating WhatsApp connection:', err)
      throw new Error('Erro ao atualizar conexão WhatsApp')
    }
  }

  // Delete connection
  const deleteConnection = async (): Promise<void> => {
    if (!connection) {
      throw new Error('Nenhuma conexão encontrada')
    }

    try {
      const { error } = await supabase
        .from('whatsapp_connections')
        .delete()
        .eq('id', connection.id)

      if (error) {
        throw error
      }

      setConnection(null)
    } catch (err) {
      console.error('Error deleting WhatsApp connection:', err)
      throw new Error('Erro ao deletar conexão WhatsApp')
    }
  }

  // Check if connected
  const isConnected = connection?.status === 'connected'
  
  // Check if has QR code
  const hasQRCode = connection?.status === 'qr_code' && connection.qr_code
  
  // Check if is connecting
  const isConnecting = connection?.status === 'qr_code'

  return {
    connection,
    loading,
    error,
    isConnected,
    hasQRCode,
    isConnecting,
    createConnection,
    updateConnection,
    deleteConnection,
    refetch: async () => {
      if (!clinicId) return
      
      setLoading(true)
      setError(null)

      try {
        const { data, error } = await supabase
          .from('whatsapp_connections')
          .select('*')
          .eq('clinic_id', clinicId)
          .single()

        if (error && error.code !== 'PGRST116') {
          throw error
        }

        setConnection(data)
      } catch (err) {
        console.error('Error refetching WhatsApp connection:', err)
        setError('Erro ao recarregar conexão WhatsApp')
      } finally {
        setLoading(false)
      }
    }
  }
}