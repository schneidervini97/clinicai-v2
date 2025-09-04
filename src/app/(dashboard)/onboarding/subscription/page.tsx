"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { CheckCircle, Loader2, CreditCard, Building2, Crown } from "lucide-react"
import { cn } from "@/lib/utils"

interface PlanType {
  id: string
  name: string
  price: number
  priceId: string
  features: string[]
  popular?: boolean
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

export default function SubscriptionPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string>("")
  const router = useRouter()

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

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <CreditCard className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold">Escolha seu Plano</h1>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Selecione o plano que melhor se adapta às necessidades da sua clínica.
          Você pode alterar seu plano a qualquer momento.
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
                Escolher {plan.name}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-500 mb-4">
          Todos os planos incluem 7 dias de teste gratuito
        </p>
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard")}
          disabled={isLoading}
        >
          Pular por agora
        </Button>
      </div>
    </div>
  )
}