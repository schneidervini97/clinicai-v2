"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { 
  CreditCard, 
  Calendar, 
  Settings, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Loader2,
  ArrowLeft,
  Crown
} from "lucide-react"
import { createClient } from '@/lib/supabase/client'
import { cn } from "@/lib/utils"

interface SubscriptionData {
  status: string
  plan_type: string
  stripe_current_period_end?: string
  stripe_customer_id?: string
}

const getStatusBadgeProps = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return { 
        variant: "default" as const, 
        icon: CheckCircle, 
        className: "bg-green-500 hover:bg-green-600",
        label: "Ativa"
      }
    case 'trialing':
      return { 
        variant: "secondary" as const, 
        icon: Clock, 
        className: "bg-blue-500 hover:bg-blue-600 text-white",
        label: "Período de Teste"
      }
    case 'past_due':
      return { 
        variant: "destructive" as const, 
        icon: AlertCircle,
        label: "Em Atraso"
      }
    case 'canceled':
      return { 
        variant: "secondary" as const, 
        icon: Clock,
        label: "Cancelada"
      }
    case 'incomplete':
      return { 
        variant: "outline" as const, 
        icon: AlertCircle,
        label: "Incompleta"
      }
    default:
      return { 
        variant: "outline" as const, 
        icon: Clock,
        label: "Inativa"
      }
  }
}

const getPlanInfo = (planType: string) => {
  switch (planType.toLowerCase()) {
    case 'basic':
      return {
        name: "Básico",
        price: "R$ 297,00",
        features: [
          "Até 100 agendamentos por mês",
          "Gestão de pacientes",
          "Relatórios básicos",
          "Suporte por email"
        ]
      }
    case 'premium':
      return {
        name: "Premium",
        price: "R$ 697,00",
        features: [
          "Agendamentos ilimitados",
          "Gestão completa de pacientes",
          "Relatórios avançados",
          "Integração com calendário",
          "Suporte prioritário",
          "Lembretes automáticos"
        ],
        isPremium: true
      }
    default:
      return {
        name: "Plano Desconhecido",
        price: "-",
        features: []
      }
  }
}

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    fetchSubscription()
  }, [])

  const fetchSubscription = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select('status, plan_type, stripe_current_period_end, stripe_customer_id')
        .eq('user_id', user.id)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching subscription:', error)
        toast.error('Erro ao carregar informações da assinatura')
      } else {
        setSubscription(data)
      }
    } catch (error) {
      console.error('Error fetching subscription:', error)
      toast.error('Erro ao carregar informações da assinatura')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenPortal = async () => {
    if (!subscription?.stripe_customer_id) {
      toast.error('Não foi possível abrir o portal. Informações de cliente não encontradas.')
      return
    }

    setPortalLoading(true)
    
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const { url } = await response.json()
        window.open(url, '_blank')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Erro ao abrir portal de pagamento')
      }
    } catch (error) {
      console.error('Error opening portal:', error)
      toast.error('Erro ao abrir portal de pagamento')
    } finally {
      setPortalLoading(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    } catch {
      return '-'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <h1 className="text-3xl font-bold">Carregando...</h1>
        </div>
      </div>
    )
  }

  const statusInfo = subscription ? getStatusBadgeProps(subscription.status) : null
  const planInfo = subscription ? getPlanInfo(subscription.plan_type) : null
  const StatusIcon = statusInfo?.icon || Clock

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/configuracoes">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            <h1 className="text-3xl font-bold">Assinatura</h1>
          </div>
          <p className="text-muted-foreground">
            Gerencie sua assinatura e informações de pagamento
          </p>
        </div>
      </div>

      {/* Subscription Status */}
      {subscription ? (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Plan Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {planInfo?.isPremium && <Crown className="h-5 w-5 text-yellow-500" />}
                Plano Atual
              </CardTitle>
              <CardDescription>Informações do seu plano ativo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Plano:</span>
                <div className="flex items-center gap-2">
                  <span>{planInfo?.name || 'Desconhecido'}</span>
                  {planInfo?.isPremium && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      Premium
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Status:</span>
                <Badge 
                  variant={statusInfo?.variant} 
                  className={cn("flex items-center gap-1", statusInfo?.className)}
                >
                  <StatusIcon className="h-3 w-3" />
                  {statusInfo?.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Valor:</span>
                <span className="font-semibold text-lg">{planInfo?.price}/mês</span>
              </div>
              {subscription.stripe_current_period_end && (
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {subscription.status === 'canceled' ? 'Cancela em:' : 'Próxima cobrança:'}
                  </span>
                  <span>{formatDate(subscription.stripe_current_period_end)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Plan Features */}
          <Card>
            <CardHeader>
              <CardTitle>Recursos Inclusos</CardTitle>
              <CardDescription>O que você tem acesso no seu plano</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {planInfo?.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Nenhuma Assinatura Encontrada
            </CardTitle>
            <CardDescription>
              Você não possui uma assinatura ativa no momento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/onboarding/subscription">
              <Button>
                <CreditCard className="h-4 w-4 mr-2" />
                Escolher Plano
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle>Ações</CardTitle>
            <CardDescription>
              Gerencie sua assinatura e informações de pagamento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Button 
                onClick={handleOpenPortal}
                disabled={portalLoading}
                className="justify-start"
              >
                {portalLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                Portal de Pagamento
              </Button>
              
              <Link href="/onboarding/subscription">
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  Trocar Plano
                </Button>
              </Link>
            </div>

            <hr className="my-4" />
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Portal de Pagamento</h4>
              <p className="text-sm text-muted-foreground">
                No portal de pagamento você pode:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Atualizar informações de cartão de crédito</li>
                <li>• Baixar notas fiscais e recibos</li>
                <li>• Cancelar sua assinatura</li>
                <li>• Ver histórico de pagamentos</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}