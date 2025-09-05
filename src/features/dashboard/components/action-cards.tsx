"use client"

// Action Cards Component
// Displays quick actions and next steps

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  Calendar, 
  Building2, 
  AlertCircle, 
  CreditCard, 
  CheckCircle 
} from "lucide-react"

interface ActionCardsProps {
  clinic: {
    name: string
    phone: string
    specialties: string[]
  } | null
  subscription: {
    status: string
    plan_type: string
    stripe_current_period_end?: string
  } | null
}

export function ActionCards({ clinic, subscription }: ActionCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>
            Acesse rapidamente as principais funcionalidades
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full justify-start" variant="outline" disabled>
            <Users className="mr-2 h-4 w-4" />
            Cadastrar Paciente
          </Button>
          <Button className="w-full justify-start" variant="outline" disabled>
            <Calendar className="mr-2 h-4 w-4" />
            Agendar Consulta
          </Button>
          <Button className="w-full justify-start" variant="outline" disabled>
            <Building2 className="mr-2 h-4 w-4" />
            Relatórios
          </Button>
        </CardContent>
      </Card>

      {/* Getting Started */}
      <Card>
        <CardHeader>
          <CardTitle>Próximos Passos</CardTitle>
          <CardDescription>
            Complete a configuração da sua clínica
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!clinic && (
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-yellow-600 mr-2" />
                <span className="text-sm">Configure os dados da sua clínica</span>
              </div>
              <Button size="sm" variant="outline">
                Configurar
              </Button>
            </div>
          )}
          
          {!subscription?.status || subscription.status !== 'active' ? (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <CreditCard className="h-4 w-4 text-blue-600 mr-2" />
                <span className="text-sm">Ative sua assinatura</span>
              </div>
              <Button size="sm" variant="outline">
                Ver Planos
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                <span className="text-sm">Configuração completa!</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}