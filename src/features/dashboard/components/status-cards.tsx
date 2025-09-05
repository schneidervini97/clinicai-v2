"use client"

// Status Cards Component
// Displays clinic info, subscription status and quick stats

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { 
  Building2, 
  Calendar, 
  CreditCard, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Clock 
} from "lucide-react"

interface StatusCardsProps {
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

const getStatusBadgeProps = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return { variant: "default" as const, iconType: "CheckCircle", className: "bg-green-500" }
    case 'past_due':
      return { variant: "destructive" as const, iconType: "AlertCircle" }
    case 'canceled':
      return { variant: "secondary" as const, iconType: "Clock" }
    default:
      return { variant: "outline" as const, iconType: "Clock" }
  }
}

const getStatusIcon = (iconType: string) => {
  switch (iconType) {
    case 'CheckCircle':
      return CheckCircle
    case 'AlertCircle':
      return AlertCircle
    case 'Clock':
      return Clock
    default:
      return Clock
  }
}

export function StatusCards({ clinic, subscription }: StatusCardsProps) {
  const statusBadgeProps = subscription 
    ? getStatusBadgeProps(subscription.status)
    : getStatusBadgeProps('inactive')

  const StatusIcon = getStatusIcon(statusBadgeProps.iconType)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Clinic Info Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Clínica</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {clinic?.name || "Não configurada"}
          </div>
          {clinic && (
            <>
              <p className="text-xs text-muted-foreground mt-1">
                {clinic.phone}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {clinic.specialties.slice(0, 2).map((specialty, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {specialty}
                  </Badge>
                ))}
                {clinic.specialties.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{clinic.specialties.length - 2}
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
            <Badge 
              variant={statusBadgeProps.variant} 
              className={cn(statusBadgeProps.className, "capitalize")}
            >
              {subscription?.status || 'Inativa'}
            </Badge>
          </div>
          <div className="text-lg font-semibold mt-2">
            Plano {subscription?.plan_type || 'Nenhum'}
          </div>
          {subscription?.stripe_current_period_end && (
            <p className="text-xs text-muted-foreground mt-1">
              Renova em {new Date(subscription.stripe_current_period_end).toLocaleDateString('pt-BR')}
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
  )
}