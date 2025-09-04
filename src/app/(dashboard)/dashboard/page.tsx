"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClient } from '@/lib/supabase/client'
import { Building2, Calendar, CreditCard, Users, CheckCircle, AlertCircle, Clock } from "lucide-react"

interface DashboardData {
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
  profile: {
    name: string
    email: string
    onboarding_status: string
  } | null
}

const getStatusBadgeProps = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return { variant: "default" as const, icon: CheckCircle, className: "bg-green-500" }
    case 'past_due':
      return { variant: "destructive" as const, icon: AlertCircle }
    case 'canceled':
      return { variant: "secondary" as const, icon: Clock }
    default:
      return { variant: "outline" as const, icon: Clock }
  }
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    clinic: null,
    subscription: null,
    profile: null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return

        // Fetch all data in parallel
        const [profileRes, clinicRes, subscriptionRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('clinics').select('*').eq('user_id', user.id).single(),
          supabase.from('subscriptions').select('*').eq('user_id', user.id).single()
        ])

        setData({
          profile: profileRes.data,
          clinic: clinicRes.data,
          subscription: subscriptionRes.data
        })
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  const statusBadgeProps = data.subscription 
    ? getStatusBadgeProps(data.subscription.status)
    : getStatusBadgeProps('inactive')

  const StatusIcon = statusBadgeProps.icon

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Bem-vindo, {data.profile?.name || 'Usuário'}!
        </h1>
        <p className="text-gray-600 mt-2">
          Gerencie sua clínica de forma simples e eficiente
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Clinic Info Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clínica</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.clinic?.name || "Não configurada"}
            </div>
            {data.clinic && (
              <>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.clinic.phone}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {data.clinic.specialties.slice(0, 2).map((specialty, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {specialty}
                    </Badge>
                  ))}
                  {data.clinic.specialties.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{data.clinic.specialties.length - 2}
                    </Badge>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Subscription Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinatura</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <StatusIcon className="h-4 w-4" />
              <Badge {...statusBadgeProps} className="capitalize">
                {data.subscription?.status || 'Inativa'}
              </Badge>
            </div>
            <div className="text-lg font-semibold mt-2">
              Plano {data.subscription?.plan_type || 'Nenhum'}
            </div>
            {data.subscription?.stripe_current_period_end && (
              <p className="text-xs text-muted-foreground mt-1">
                Renova em {new Date(data.subscription.stripe_current_period_end).toLocaleDateString('pt-BR')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estatísticas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Pacientes cadastrados
            </p>
            <div className="flex items-center space-x-4 mt-2 text-sm">
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                0 consultas hoje
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Cards */}
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
            {!data.clinic && (
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
            
            {!data.subscription?.status || data.subscription.status !== 'active' ? (
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
    </>
  )
}