"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { CheckCircle, Loader2, CreditCard, Building2, Crown, AlertCircle, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from '@/lib/supabase/client'

interface PlanType {
  id: string
  name: string
  price: number
  priceId: string
  features: string[]
  popular?: boolean
}

interface SubscriptionData {
  status: string
  plan_type: string
  stripe_current_period_end?: string
}

const plans: PlanType[] = [
  {
    id: "basic",
    name: "Básico",
    price: 297.00,
    priceId: "price_1S1R815EyKnKUvjFiPfCHqST",
    features: [
      "Até 100 agendamentos por mês",
      "Gestão de pacientes",
      "Relatórios básicos",
      "Suporte por email",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: 697.00,
    priceId: "price_1S1R8N5EyKnKUvjFyxmbmn4s",
    popular: true,
    features: [
      "Agendamentos ilimitados",
      "Gestão completa de pacientes",
      "Relatórios avançados",
      "Integração com calendário",
      "Suporte prioritário",
      "Lembretes automáticos",
    ],
  },
]

const getStatusMessage = (status: string) => {
  switch (status.toLowerCase()) {
    case 'canceled':
      return {
        title: "Assinatura Cancelada",
        description: "Sua assinatura foi cancelada. Para continuar usando o sistema, escolha um novo plano.",
        color: "text-red-600"
      }
    case 'past_due':
      return {
        title: "Pagamento em Atraso",
        description: "Houve um problema com o pagamento da sua assinatura. Renove para continuar usando o sistema.",
        color: "text-orange-600"
      }
    case 'incomplete':
      return {
        title: "Assinatura Incompleta",
        description: "Sua assinatura não foi finalizada corretamente. Complete o processo para ter acesso ao sistema.",
        color: "text-yellow-600"
      }
    case 'unpaid':
      return {
        title: "Assinatura Não Paga",
        description: "Sua assinatura não foi paga. Renove para continuar usando o sistema.",
        color: "text-red-600"
      }
    default:
      return {
        title: "Assinatura Inativa",
        description: "Para usar o sistema, é necessário ter uma assinatura ativa. Escolha um plano abaixo.",
        color: "text-gray-600"
      }
  }
}

export default function RenewalPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string>("")
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const router = useRouter()
  
  useEffect(() => {
    fetchSubscriptionStatus()
  }, [])

  const fetchSubscriptionStatus = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return
      
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status, plan_type, stripe_current_period_end')
        .eq('user_id', user.id)
        .single()
      
      setSubscription(subscription)
    } catch (error) {
      console.error('Error fetching subscription:', error)
    }
  }

  const handlePlanSelection = async (planId: string, priceId: string) => {
    setIsLoading(true)
    setSelectedPlan(planId)

    try {
      // Criar sessão de checkout do Stripe
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: priceId,
        }),
      })

      if (response.ok) {
        const { url } = await response.json()
        // Redirecionar para o checkout do Stripe
        window.location.href = url
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Erro ao processar pagamento")
      }
    } catch (error) {
      toast.error("Erro ao processar pagamento")
    } finally {
      setIsLoading(false)
      setSelectedPlan("")
    }
  }

  const handleCheckStatus = async () => {
    setCheckingStatus(true)
    await fetchSubscriptionStatus()
    
    // Check if subscription is now active
    setTimeout(async () => {
      const supabase = createClient()
      const { data: updatedSubscription } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single()
      
      if (updatedSubscription && ['active', 'trialing'].includes(updatedSubscription.status)) {
        toast.success("Assinatura ativada! Redirecionando...")
        router.push('/dashboard')
      } else {
        toast.info("Status da assinatura ainda não foi atualizado. Tente novamente em alguns segundos.")
      }
      setCheckingStatus(false)
    }, 2000)
  }

  const statusInfo = subscription ? getStatusMessage(subscription.status) : null

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <AlertCircle className="h-8 w-8 text-orange-600" />
          <h1 className="text-2xl font-bold">Renovar Assinatura</h1>
        </div>
        
        {statusInfo && (
          <div className={`max-w-2xl mx-auto p-4 rounded-lg bg-muted/50 border-l-4 ${statusInfo.color} border-current`}>
            <h3 className={`font-semibold ${statusInfo.color} mb-2`}>{statusInfo.title}</h3>
            <p className="text-muted-foreground">{statusInfo.description}</p>
            
            {subscription && (
              <div className="mt-3 text-sm text-muted-foreground">
                <p>Status atual: <span className="font-medium">{subscription.status}</span></p>
                {subscription.plan_type && (
                  <p>Plano anterior: <span className="font-medium capitalize">{subscription.plan_type}</span></p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Check Status Button */}
      <div className="mb-6 text-center">
        <Button 
          onClick={handleCheckStatus}
          disabled={checkingStatus}
          variant="outline"
          className="gap-2"
        >
          {checkingStatus ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Verificar Status da Assinatura
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Se você acabou de fazer o pagamento, clique aqui para verificar se foi processado
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={cn(
              "relative cursor-pointer transition-all duration-200 hover:shadow-lg",
              plan.popular && "border-blue-500 ring-2 ring-blue-100"
            )}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                  <Crown className="h-3 w-3" />
                  Mais Popular
                </div>
              </div>
            )}

            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Building2 className="h-5 w-5" />
                {plan.name}
              </CardTitle>
              <div className="text-3xl font-bold text-blue-600">
                R$ {plan.price.toFixed(2).replace(".", ",")}
                <span className="text-base text-gray-500 font-normal">/mês</span>
              </div>
            </CardHeader>

            <CardContent>
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handlePlanSelection(plan.id, plan.priceId)}
                disabled={isLoading}
                className={cn(
                  "w-full",
                  plan.popular && "bg-blue-600 hover:bg-blue-700"
                )}
                variant={plan.popular ? "default" : "outline"}
              >
                {isLoading && selectedPlan === plan.id && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Renovar com {plan.name}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Todos os planos incluem 7 dias de teste gratuito
        </p>
        <p className="text-xs text-muted-foreground">
          Precisa de ajuda? Entre em contato conosco pelo email: suporte@clinicas.com.br
        </p>
      </div>
    </div>
  )
}