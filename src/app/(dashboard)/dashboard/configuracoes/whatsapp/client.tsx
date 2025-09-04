// WhatsApp configuration client component
// Client-side logic for WhatsApp connection management

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Smartphone, 
  MessageSquare, 
  CheckCircle, 
  AlertCircle,
  Settings,
  Users,
  BarChart3
} from 'lucide-react'
import { WhatsAppConnectionComponent } from '@/features/chat/components/whatsapp-connection'
import { useWhatsAppConnection } from '@/features/chat/hooks/useWhatsAppConnection'
import { EvolutionService } from '@/features/chat/services/evolution.service'
import { WhatsAppConnection } from '@/features/chat/types/chat.types'

interface Clinic {
  id: string
  name: string
}

interface WhatsAppConfigurationClientProps {
  clinic: Clinic
  initialConnection: WhatsAppConnection | null
}

export function WhatsAppConfigurationClient({ 
  clinic, 
  initialConnection 
}: WhatsAppConfigurationClientProps) {
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const {
    connection,
    loading,
    isConnected,
    hasQRCode,
    createConnection,
    updateConnection,
    deleteConnection,
    refetch
  } = useWhatsAppConnection({ clinicId: clinic.id })

  // Use initial connection only if hook is still loading, otherwise use hook state
  const currentConnection = !loading ? connection : initialConnection


  const handleCreateConnection = async () => {
    setCreating(true)
    setError(null)

    try {
      const instanceName = `clinic_${clinic.id.replace(/-/g, '')}`
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/evolution`

      // Create connection in database
      await createConnection(instanceName, webhookUrl)

      // Create instance in Evolution API with webhook configured
      await EvolutionService.createInstance({
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
      })

      // Connection created successfully - user can now manually connect
      console.log('WhatsApp connection created successfully. User can now click "Conectar" to get QR code.')

    } catch (err) {
      console.error('Error creating WhatsApp connection:', err)
      setError('Erro ao criar conexão WhatsApp. Verifique se a Evolution API está funcionando.')
    } finally {
      setCreating(false)
    }
  }

  const handleConnectionUpdate = async (updatedConnection: Partial<WhatsAppConnection>) => {
    await updateConnection(updatedConnection)
  }

  const handleConnectionDelete = async () => {
    await deleteConnection()
  }

  const handleUpdateWebhook = async () => {
    setError(null)
    
    try {
      const response = await fetch('/api/whatsapp/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to update webhook')
      }

      const result = await response.json()
      console.log('Webhook updated:', result)
      
      // Show success message
      setError(null)
      
    } catch (err) {
      console.error('Error updating webhook:', err)
      setError('Erro ao atualizar webhook. Verifique se a instância está conectada.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status WhatsApp</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isConnected ? (
                <Badge className="bg-green-500 hover:bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Conectado
                </Badge>
              ) : hasQRCode ? (
                <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600 text-white">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Aguardando
                </Badge>
              ) : (
                <Badge variant="outline" className="border-red-500 text-red-600">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Desconectado
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {isConnected && 'Pronto para receber mensagens'}
              {hasQRCode && 'Escaneie o QR code para conectar'}
              {!isConnected && !hasQRCode && 'Configure a conexão WhatsApp'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversas Ativas</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-2">
              Conversas hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensagens</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-2">
              Mensagens hoje
            </p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Connection Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WhatsAppConnectionComponent
          connection={currentConnection}
          onConnectionUpdate={handleConnectionUpdate}
          onConnectionDelete={handleConnectionDelete}
          onCreateConnection={handleCreateConnection}
        />

        {/* Setup Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Como Configurar
            </CardTitle>
            <CardDescription>
              Siga estes passos para configurar o WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-semibold">
                  1
                </div>
                <div>
                  <p className="font-medium">Configure a Conexão</p>
                  <p className="text-sm text-muted-foreground">
                    {!currentConnection ? 'Clique em "Criar Conexão" para começar' : 'Conexão já criada ✓'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-semibold">
                  2
                </div>
                <div>
                  <p className="font-medium">Escaneie o QR Code</p>
                  <p className="text-sm text-muted-foreground">
                    Use o WhatsApp do seu celular para escanear o código
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center font-semibold">
                  3
                </div>
                <div>
                  <p className="font-medium">Comece a Conversar</p>
                  <p className="text-sm text-muted-foreground">
                    Acesse a seção Chat para gerenciar suas conversas
                  </p>
                </div>
              </div>
            </div>

            {!currentConnection && (
              <Button 
                onClick={handleCreateConnection} 
                disabled={creating || loading}
                className="w-full"
              >
                {creating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
                    Criando Conexão...
                  </>
                ) : (
                  <>
                    <Smartphone className="h-4 w-4 mr-2" />
                    Criar Conexão WhatsApp
                  </>
                )}
              </Button>
            )}

            {isConnected && (
              <div className="space-y-2">
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    // Navigate to chat page
                    window.location.href = '/dashboard/chat'
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Ir para Chat
                </Button>
                
                <Button 
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={handleUpdateWebhook}
                >
                  <Settings className="h-3 w-3 mr-2" />
                  Reconfigurar Webhook
                </Button>
              </div>
            )}

            {currentConnection && !isConnected && (
              <Button 
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={handleUpdateWebhook}
              >
                <Settings className="h-3 w-3 mr-2" />
                Reconfigurar Webhook
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Features Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Funcionalidades WhatsApp
          </CardTitle>
          <CardDescription>
            O que você pode fazer com a integração WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold">Recebimento</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Mensagens de texto</li>
                <li>• Imagens e vídeos</li>
                <li>• Documentos</li>
                <li>• Áudios</li>
                <li>• Localização</li>
                <li>• Contatos</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Envio</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Respostas rápidas</li>
                <li>• Anexar arquivos</li>
                <li>• Vincular com pacientes</li>
                <li>• Histórico de conversas</li>
                <li>• Status de entrega</li>
                <li>• Notificações em tempo real</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}