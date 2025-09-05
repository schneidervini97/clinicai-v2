// WhatsApp connection component
// Handles QR code display, connection status, and instance management

'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Smartphone, 
  QrCode, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  RefreshCw,
  Trash2
} from 'lucide-react'
import { WhatsAppConnection } from '../types/chat.types'
import { EvolutionService } from '../services/evolution.service'
import { cn } from '@/lib/utils'
import QRCode from 'qrcode'

interface WhatsAppConnectionProps {
  connection: WhatsAppConnection | null
  onConnectionUpdate: (connection: WhatsAppConnection) => void
  onConnectionDelete: () => void
  onCreateConnection?: () => Promise<void>
  className?: string
}

export function WhatsAppConnectionComponent({
  connection,
  onConnectionUpdate,
  onConnectionDelete,
  onCreateConnection,
  className
}: WhatsAppConnectionProps) {
  const [loading, setLoading] = useState(false)
  const [loadingQR, setLoadingQR] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [instanceNotFound, setInstanceNotFound] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)

  // Update QR code when connection changes
  useEffect(() => {
    if (connection?.qr_code) {
      setQrCodeUrl(connection.qr_code)
    } else {
      setQrCodeUrl(null)
      setPairingCode(null)
    }
  }, [connection?.qr_code])

  // Force UI update when connection status changes
  useEffect(() => {
    console.log('Connection status changed:', connection?.status)
    
    if (connection?.status === 'connected') {
      // Clear QR code when connected
      setQrCodeUrl(null)
      setPairingCode(null)
      console.log('Connection established - clearing QR code UI')
    }
  }, [connection?.status])


  const handleConnect = async () => {
    if (!connection) return

    setLoading(true)
    setError(null)
    setInstanceNotFound(false)

    try {
      // Step 1: Verify instance exists before attempting connection
      console.log('🔍 Checking if instance exists before connecting...')
      const existsCheck = await EvolutionService.checkInstanceExists(connection.instance_name)
      
      if (!existsCheck.exists) {
        console.error('❌ Instance not found:', existsCheck.error)
        setInstanceNotFound(true)
        setError('Instância não encontrada na Evolution API. É necessário recriar a conexão.')
        return
      }
      
      console.log('✅ Instance exists, proceeding with connection...')
      
      // Step 2: Get QR code from Evolution API
      const result = await EvolutionService.connectInstance(connection.instance_name)
      
      if (result.base64 && result.count && result.count > 0) {
        // Use QR code base64 directly from API
        setQrCodeUrl(result.base64)
        setLoadingQR(false)
        
        // Set pairing code if available
        if (result.pairingCode) {
          setPairingCode(result.pairingCode)
        }
        
        // Update connection status
        onConnectionUpdate({
          ...connection,
          status: 'qr_code',
          qr_code: result.base64
        })
      } else if (result.pairingCode) {
        // If no QR code but has pairing code
        setPairingCode(result.pairingCode)
        
        onConnectionUpdate({
          ...connection,
          status: 'qr_code',
          qr_code: null
        })
      } else if (result.count === 0) {
        // QR code not ready yet, show loading and try again after delay
        setLoadingQR(true)
        setTimeout(() => {
          handleConnect()
        }, 2000)
        return
      }
    } catch (err: unknown) {
      console.error('Error connecting to WhatsApp:', err)
      
      // Check if it's a 404 error (instance doesn't exist)
      if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' && 
          (err.message.includes('404') || err.message.includes('not found'))) {
        setInstanceNotFound(true)
        setError('Instância não encontrada na Evolution API. É necessário recriar a conexão.')
      } else {
        setError('Erro ao conectar com WhatsApp. Tente novamente.')
      }
    } finally {
      setLoading(false)
      setLoadingQR(false)
    }
  }

  const handleDisconnect = async () => {
    if (!connection) return

    setLoading(true)
    setError(null)

    try {
      await EvolutionService.logoutInstance(connection.instance_name)
      
      onConnectionUpdate({
        ...connection,
        status: 'disconnected',
        qr_code: null,
        phone_number: null
      })
      
      setQrCodeUrl(null)
      setPairingCode(null)
    } catch (err) {
      console.error('Error disconnecting from WhatsApp:', err)
      setError('Erro ao desconectar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleRestart = async () => {
    if (!connection) return

    setLoading(true)
    setError(null)
    setInstanceNotFound(false)

    try {
      // Step 1: Check if instance exists before restarting
      console.log('🔍 Checking if instance exists before restarting...')
      const existsCheck = await EvolutionService.checkInstanceExists(connection.instance_name)
      
      if (!existsCheck.exists) {
        console.error('❌ Instance not found for restart:', existsCheck.error)
        setInstanceNotFound(true)
        setError('Instância não encontrada na Evolution API. É necessário recriar a conexão.')
        setLoading(false)
        return
      }
      
      console.log('✅ Instance exists, proceeding with restart...')
      
      // Step 2: Restart the instance
      await EvolutionService.restartInstance(connection.instance_name)
      console.log('🔄 Instance restarted successfully')
      
      // Step 3: Wait a bit then get new QR code
      setTimeout(() => {
        handleConnect()
      }, 2000)
    } catch (err: any) {
      console.error('Error restarting instance:', err)
      
      // Check if it's a 404 error (instance doesn't exist)
      if (err.message && (err.message.includes('404') || err.message.includes('not found'))) {
        setInstanceNotFound(true)
        setError('Instância não encontrada na Evolution API. É necessário recriar a conexão.')
      } else {
        setError('Erro ao reiniciar instância. Tente novamente.')
      }
      setLoading(false)
    }
  }

  const handleSmartReconnect = async () => {
    if (!connection) return

    setReconnecting(true)
    setError(null)
    setInstanceNotFound(false)

    try {
      console.log('🔄 Starting smart reconnection...')
      
      const result = await EvolutionService.reconnectInstance(connection.instance_name)
      
      if (result.success && result.qrResult) {
        console.log('✅ Smart reconnection successful')
        
        // Update UI with new QR code
        if (result.qrResult.base64) {
          setQrCodeUrl(result.qrResult.base64)
        }
        
        if (result.qrResult.pairingCode) {
          setPairingCode(result.qrResult.pairingCode)
        }
        
        // Update connection status
        onConnectionUpdate({
          ...connection,
          status: 'qr_code',
          qr_code: result.qrResult.base64 || null
        })
        
        setError(null)
      } else {
        console.error('❌ Smart reconnection failed:', result.error)
        
        if (result.error?.includes('not found')) {
          setInstanceNotFound(true)
          setError('Instância não encontrada. É necessário recriar a conexão.')
        } else {
          setError(`Erro na reconexão: ${result.error}`)
        }
      }
    } catch (err: any) {
      console.error('Smart reconnect error:', err)
      setError('Erro na reconexão inteligente. Tente novamente.')
    } finally {
      setReconnecting(false)
    }
  }

  const handleRecreateConnection = async () => {
    if (!connection) return

    setLoading(true)
    setError(null)
    setInstanceNotFound(false)

    try {
      console.log('🆕 Starting connection recreation...')
      
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/evolution`
      
      const result = await EvolutionService.recreateInstance(
        connection.instance_name,
        webhookUrl
      )
      
      if (result.success && result.qrResult) {
        console.log('✅ Connection recreated successfully')
        
        // Update UI with new QR code
        if (result.qrResult.base64) {
          setQrCodeUrl(result.qrResult.base64)
        }
        
        if (result.qrResult.pairingCode) {
          setPairingCode(result.qrResult.pairingCode)
        }
        
        // Update connection status
        onConnectionUpdate({
          ...connection,
          status: 'qr_code',
          qr_code: result.qrResult.base64 || null
        })
        
        setError(null)
        setInstanceNotFound(false)
      } else {
        console.error('❌ Connection recreation failed:', result.error)
        setError(`Erro ao recriar conexão: ${result.error}`)
      }
    } catch (err: any) {
      console.error('Recreate connection error:', err)
      setError('Erro ao recriar conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!connection) return
    
    if (!confirm('Tem certeza que deseja excluir a conexão WhatsApp? Esta ação não pode ser desfeita.')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      await EvolutionService.deleteInstance(connection.instance_name)
      onConnectionDelete()
    } catch (err) {
      console.error('Error deleting instance:', err)
      setError('Erro ao excluir instância. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }



  const getStatusBadge = () => {
    if (!connection) return null

    const statusConfig = {
      connected: { 
        label: 'Conectado', 
        variant: 'default' as const, 
        icon: CheckCircle,
        className: 'bg-green-500 hover:bg-green-600'
      },
      qr_code: { 
        label: 'Aguardando QR Code', 
        variant: 'secondary' as const, 
        icon: QrCode,
        className: 'bg-yellow-500 hover:bg-yellow-600 text-white'
      },
      disconnected: { 
        label: 'Desconectado', 
        variant: 'outline' as const, 
        icon: AlertCircle,
        className: 'border-red-500 text-red-600'
      },
      error: { 
        label: 'Erro', 
        variant: 'destructive' as const, 
        icon: AlertCircle,
        className: ''
      }
    }

    const config = statusConfig[connection.status] || statusConfig.error
    const IconComponent = config.icon

    return (
      <Badge variant={config.variant} className={cn('gap-1', config.className)}>
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Conexão WhatsApp
            </CardTitle>
            <CardDescription>
              Configure a conexão do WhatsApp para receber e enviar mensagens
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!connection ? (
          <div className="text-center py-8">
            <Smartphone className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="font-medium text-lg mb-2">Nenhuma conexão configurada</h3>
            <p className="text-muted-foreground mb-4">
              Configure uma conexão WhatsApp para começar a conversar com seus pacientes
            </p>
            <Button 
              onClick={onCreateConnection}
              disabled={loading || !onCreateConnection}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
                  Criando...
                </>
              ) : (
                <>
                  <Smartphone className="h-4 w-4 mr-2" />
                  Criar Conexão
                </>
              )}
            </Button>
          </div>
        ) : (
          <>
            {/* Connection info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Instância:</span>
                <code className="bg-muted px-2 py-1 rounded text-xs">
                  {connection.instance_name}
                </code>
              </div>
              
              {connection.phone_number && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Número:</span>
                  <span className="font-mono">+{connection.phone_number}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status:</span>
                {getStatusBadge()}
              </div>
            </div>

            {/* QR Code and Pairing Code display */}
            {connection.status === 'qr_code' && (
              <div className="space-y-4">
                {qrCodeUrl ? (
                  <div className="text-center">
                    <h3 className="font-medium mb-2">Escaneie o QR Code</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Abra o WhatsApp no seu celular e escaneie o código abaixo
                    </p>
                    
                    <div className="inline-block p-4 bg-white rounded-lg border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrCodeUrl}
                        alt="QR Code WhatsApp"
                        className="w-48 h-48 mx-auto"
                      />
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-2">
                      O QR Code expira em alguns minutos
                    </p>
                  </div>
                ) : pairingCode ? (
                  <div className="text-center">
                    <h3 className="font-medium mb-2">Código de Pareamento</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Digite este código no WhatsApp do seu celular
                    </p>
                    
                    <div className="inline-block p-6 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-3xl font-mono font-bold text-blue-800 tracking-wider">
                        {pairingCode}
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-2">
                      O código expira em alguns minutos
                    </p>
                  </div>
                ) : loadingQR ? (
                  <div className="text-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">
                      Gerando código de conexão...
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Aguardando código de conexão...
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Connected state */}
            {connection.status === 'connected' && (
              <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <h3 className="font-medium text-green-800 mb-1">
                  WhatsApp conectado!
                </h3>
                <p className="text-sm text-green-600">
                  Sua clínica já pode receber e enviar mensagens
                </p>
                {connection.phone_number && (
                  <p className="text-sm text-green-600 mt-2">
                    Número: +{connection.phone_number}
                  </p>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-3">
              {/* Instance not found warning */}
              {instanceNotFound && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Instância não encontrada!</strong>
                    <br />A instância foi deletada na Evolution API. É necessário recriar a conexão.
                  </AlertDescription>
                </Alert>
              )}

              {/* Main action buttons */}
              <div className="flex gap-2">
                {connection.status === 'disconnected' && !instanceNotFound && (
                  <Button 
                    onClick={handleConnect} 
                    disabled={loading || reconnecting}
                    className="flex-1"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <QrCode className="h-4 w-4 mr-2" />
                    )}
                    Conectar WhatsApp
                  </Button>
                )}

                {connection.status === 'qr_code' && !instanceNotFound && (
                  <Button 
                    variant="outline"
                    onClick={handleConnect} 
                    disabled={loading || reconnecting}
                    className="flex-1"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Atualizar QR Code
                  </Button>
                )}

                {connection.status === 'connected' && !instanceNotFound && (
                  <Button 
                    variant="outline"
                    onClick={handleDisconnect} 
                    disabled={loading || reconnecting}
                    className="flex-1"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <AlertCircle className="h-4 w-4 mr-2" />
                    )}
                    Desconectar
                  </Button>
                )}

                {/* Recreate connection button when instance not found */}
                {instanceNotFound && (
                  <Button 
                    onClick={handleRecreateConnection}
                    disabled={loading || reconnecting}
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Recriar Conexão
                  </Button>
                )}

                {/* Smart reconnect button (only when connected but having issues) */}
                {connection.status === 'connected' && !instanceNotFound && (
                  <Button 
                    variant="outline"
                    onClick={handleSmartReconnect}
                    disabled={loading || reconnecting}
                    size="sm"
                    className="bg-blue-50 hover:bg-blue-100"
                  >
                    {reconnecting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Reconectar
                  </Button>
                )}

                {!instanceNotFound && (
                  <Button 
                    variant="outline"
                    onClick={handleRestart} 
                    disabled={loading || reconnecting}
                    size="icon"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                )}


                <Button 
                  variant="outline"
                  onClick={handleDelete} 
                  disabled={loading || reconnecting}
                  size="icon"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Instructions */}
            {connection.status === 'qr_code' && (
              <Alert>
                <QrCode className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Como conectar:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Abra o WhatsApp no seu celular</li>
                    <li>Toque em &quot;Mais opções&quot; ou nos três pontos no canto superior direito</li>
                    <li>Toque em &quot;Aparelhos conectados&quot;</li>
                    <li>Toque em &quot;Conectar um aparelho&quot;</li>
                    <li>Aponte a câmera do seu celular para este QR code</li>
                  </ol>
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}