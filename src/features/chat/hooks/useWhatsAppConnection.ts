// WhatsApp connection management hook
// Handles connection status, QR code, and real-time updates

'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WhatsAppConnection, RealtimePayload } from '../types/chat.types'
import { EvolutionService } from '../services/evolution.service'

interface UseWhatsAppConnectionProps {
  clinicId: string
}

export function useWhatsAppConnection({ clinicId }: UseWhatsAppConnectionProps) {
  const [connection, setConnection] = useState<WhatsAppConnection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isTabActiveRef = useRef(true)
  const lastCheckTimestampRef = useRef<number>(0)
  const supabase = useMemo(() => createClient(), [])

  // Constants for optimization
  const MIN_CHECK_INTERVAL = 60 * 1000  // 1 minute minimum between checks

  // Helper for conditional logging
  const debugLog = (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(...args)
    }
  }

  // Get intelligent health check interval based on connection status
  const getHealthCheckInterval = (connection: WhatsAppConnection | null): number | null => {
    if (!connection || !isTabActiveRef.current) return null
    
    switch(connection.status) {
      case 'connected':
        return 10 * 60 * 1000    // 10 minutes if connected and stable
      case 'qr_code':
        return 30 * 1000         // 30 seconds while waiting for QR scan
      case 'disconnected':
        return 2 * 60 * 1000     // 2 minutes if disconnected
      default:
        return 5 * 60 * 1000     // 5 minutes default
    }
  }

  // Check if we should perform health check (with cache logic)
  const shouldPerformCheck = (): boolean => {
    const now = Date.now()
    
    // Avoid too frequent checks (debounce)
    if (now - lastCheckTimestampRef.current < MIN_CHECK_INTERVAL) {
      debugLog('⏭️ Health check skipped - too recent')
      return false
    }
    
    if (!connection) return false
    
    // Always check if disconnected
    if (connection.status === 'disconnected') return true
    
    // Check if we never verified health
    if (!connection.last_health_check_at) return true
    
    // Check if last verification was more than 5 minutes ago
    const lastCheck = new Date(connection.last_health_check_at).getTime()
    const fiveMinutesAgo = now - (5 * 60 * 1000)
    
    return lastCheck < fiveMinutesAgo
  }

  // Check if we should perform immediate check when tab becomes active
  const shouldPerformImmediateCheck = (): boolean => {
    if (!connection) return false
    
    const now = Date.now()
    const lastCheck = connection.last_health_check_at 
      ? new Date(connection.last_health_check_at).getTime()
      : 0
    
    // Immediate check if last verification was more than 5 minutes ago
    return (now - lastCheck) > (5 * 60 * 1000)
  }

  // Start/restart health check interval with intelligent timing
  const startHealthCheckInterval = () => {
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current)
      healthCheckIntervalRef.current = null
    }
    
    const interval = getHealthCheckInterval(connection)
    if (interval) {
      debugLog(`🔄 Starting health check interval: ${interval/1000}s for status: ${connection?.status}`)
      healthCheckIntervalRef.current = setInterval(performHealthCheck, interval)
    }
  }

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
  }, [clinicId])

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
          const timestamp = new Date().toISOString()
          console.log('🔄 Real-time update received:', {
            timestamp,
            eventType: payload.eventType,
            schema: payload.schema,
            table: payload.table,
            instanceName: payload.new?.instance_name || payload.old?.instance_name,
            statusChange: {
              old: payload.old?.status,
              new: payload.new?.status
            },
            qrCodeChange: {
              hadQR: !!payload.old?.qr_code,
              hasQR: !!payload.new?.qr_code,
              qrLength: payload.new?.qr_code?.length
            },
            healthStatus: {
              old: payload.old?.health_check_status,
              new: payload.new?.health_check_status
            }
          })
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const oldConnection = connection
            console.log('🔄 Updating connection state:', {
              instanceName: payload.new?.instance_name,
              statusUpdate: `${oldConnection?.status} → ${payload.new?.status}`,
              qrCodeUpdate: `${oldConnection?.qr_code ? 'had QR' : 'no QR'} → ${payload.new?.qr_code ? 'has QR' : 'no QR'}`,
              timestamp
            })
            
            setConnection(payload.new)
            
            // Force UI update by clearing any error states when status improves
            if (payload.new?.status === 'connected' || payload.new?.qr_code) {
              setError(null)
            }
          } else if (payload.eventType === 'DELETE') {
            console.log('🗑️ Removing connection due to DELETE event:', {
              instanceName: payload.old?.instance_name,
              timestamp
            })
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
  }, [clinicId])

  // Visibility API - Pause health checks when tab is inactive
  useEffect(() => {
    const handleVisibilityChange = () => {
      const wasActive = isTabActiveRef.current
      isTabActiveRef.current = !document.hidden
      
      if (document.hidden && wasActive) {
        // Tab became inactive - pause health checks
        debugLog('⏸️ Health check paused - tab inactive')
        if (healthCheckIntervalRef.current) {
          clearInterval(healthCheckIntervalRef.current)
          healthCheckIntervalRef.current = null
        }
      } else if (!document.hidden && !wasActive) {
        // Tab became active - resume health checks
        debugLog('▶️ Health check resumed - tab active')
        
        // Perform immediate check if needed (after being inactive for >5 min)
        if (shouldPerformImmediateCheck()) {
          debugLog('🔍 Performing immediate health check after tab activation')
          performHealthCheck()
        }
        
        // Restart interval
        startHealthCheckInterval()
      }
    }
    
    // Set initial tab state
    isTabActiveRef.current = !document.hidden
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [connection])

  // Optimized health check function
  const performHealthCheck = async () => {
    if (!connection || !shouldPerformCheck()) {
      return
    }

    // Update cache timestamp
    lastCheckTimestampRef.current = Date.now()
    const previousStatus = connection.health_check_status

    try {
      debugLog('🔍 Performing health check for:', connection.instance_name)
      
      // Check if instance exists and get status
      const existsCheck = await EvolutionService.checkInstanceExists(connection.instance_name)
      
      let healthStatus: string
      let healthError: string | null = null
      let connectionStatus = connection.status

      if (!existsCheck.exists) {
        // Instance doesn't exist in Evolution
        healthStatus = 'not_found'
        healthError = existsCheck.error || 'Instance not found'
        connectionStatus = 'disconnected'
      } else {
        // Instance exists, check its connection state
        switch (existsCheck.status) {
          case 'open':
            healthStatus = 'healthy'
            connectionStatus = 'connected'
            break
          
          case 'connecting':
            healthStatus = 'healthy'
            connectionStatus = 'qr_code'
            break
            
          case 'close':
            healthStatus = 'unhealthy'
            healthError = 'Instance disconnected from WhatsApp'
            connectionStatus = 'disconnected'
            break
            
          default:
            healthStatus = 'unknown'
            healthError = 'Unknown connection status'
        }
      }

      // Log only status changes (not every check)
      if (healthStatus !== previousStatus) {
        console.log(`🔄 Health status changed: ${previousStatus} → ${healthStatus}`)
      }

      // Update database with health check results
      const { error } = await supabase
        .from('whatsapp_connections')
        .update({
          last_health_check_at: new Date().toISOString(),
          health_check_status: healthStatus,
          health_check_error: healthError,
          health_check_count: (connection.health_check_count || 0) + 1,
          status: connectionStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', connection.id)

      if (error) {
        console.error('❌ Error updating health check:', error)
        return
      }

      // Restart interval with new timing if connection status changed
      if (connectionStatus !== connection.status) {
        debugLog(`🔄 Connection status changed: ${connection.status} → ${connectionStatus}`)
        startHealthCheckInterval()
      }
      
    } catch (error: any) {
      // Log only critical errors
      if (process.env.NODE_ENV === 'production') {
        console.error('Health check failed')
      } else {
        console.error('❌ Health check failed:', error.message)
      }
      
      // Update with error status
      try {
        await supabase
          .from('whatsapp_connections')
          .update({
            last_health_check_at: new Date().toISOString(),
            health_check_status: 'unhealthy',
            health_check_error: `Health check failed: ${error.message}`,
            health_check_count: (connection.health_check_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', connection.id)
      } catch (updateError) {
        console.error('❌ Error updating failed health check:', updateError)
      }
    }
  }

  // Health check lifecycle management
  useEffect(() => {
    if (!connection?.instance_name || !isTabActiveRef.current) return

    debugLog('🩺 Starting health check for instance:', connection.instance_name)
    
    // Initial health check after 3 seconds (if needed)
    const initialTimeout = setTimeout(() => {
      if (shouldPerformCheck()) {
        debugLog('🔍 Performing initial health check')
        performHealthCheck()
      }
    }, 3000)

    // Start intelligent interval-based health check
    startHealthCheckInterval()

    // Cleanup function
    return () => {
      if (initialTimeout) clearTimeout(initialTimeout)
      if (healthCheckIntervalRef.current) {
        debugLog('🛑 Clearing health check interval')
        clearInterval(healthCheckIntervalRef.current)
        healthCheckIntervalRef.current = null
      }
    }
  }, [connection?.instance_name, connection?.status, connection?.health_check_status]) // Add health_check_status

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

  // Manual refetch function
  const refetch = async () => {
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
      
      // Clear error state if we got data
      if (data) {
        setError(null)
      }
    } catch (err) {
      console.error('Error refetching WhatsApp connection:', err)
      setError('Erro ao recarregar conexão WhatsApp')
    } finally {
      setLoading(false)
    }
  }

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
    refetch
  }
}