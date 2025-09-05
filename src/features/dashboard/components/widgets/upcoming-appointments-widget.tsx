"use client"

// Widget de Próximas Consultas
// Lista das próximas consultas agendadas

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, User, Phone } from "lucide-react"
import { DashboardAppointment } from "../../types/dashboard.types"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import Link from "next/link"

interface UpcomingAppointmentsWidgetProps {
  appointments: DashboardAppointment[]
  loading?: boolean
}

export function UpcomingAppointmentsWidget({ 
  appointments, 
  loading = false 
}: UpcomingAppointmentsWidgetProps) {
  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 w-24 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'confirmada':
        return 'bg-green-100 text-green-800'
      case 'pending':
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
      case 'cancelada':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'Confirmada'
      case 'pending':
        return 'Pendente'
      case 'cancelled':
        return 'Cancelada'
      case 'completed':
        return 'Realizada'
      default:
        return status
    }
  }

  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(':')
      return `${hours}:${minutes}`
    } catch {
      return time
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr + 'T00:00:00')
      return format(date, 'dd/MM', { locale: ptBR })
    } catch {
      return dateStr
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          <Calendar className="h-4 w-4 inline mr-2" />
          Próximas Consultas
        </CardTitle>
        {appointments.length > 0 && (
          <Link href="/dashboard/agenda">
            <Button variant="outline" size="sm">
              Ver todas
            </Button>
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              Nenhuma consulta agendada para os próximos dias
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.slice(0, 5).map((appointment) => (
              <div
                key={appointment.id}
                className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {appointment.patient_name}
                    </p>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getStatusBadgeColor(appointment.status)}`}
                    >
                      {getStatusLabel(appointment.status)}
                    </Badge>
                  </div>
                  
                  <div className="mt-1 flex items-center text-sm text-gray-600">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>
                      {formatDate(appointment.date)} às {formatTime(appointment.start_time)}
                    </span>
                    {appointment.is_today && (
                      <Badge variant="default" className="ml-2 text-xs bg-blue-100 text-blue-800">
                        Hoje
                      </Badge>
                    )}
                  </div>
                  
                  <div className="mt-1 text-xs text-gray-500">
                    <span className="font-medium">{appointment.professional_name}</span>
                    {appointment.consultation_type && (
                      <span className="ml-2">• {appointment.consultation_type}</span>
                    )}
                  </div>
                  
                  {appointment.patient_phone && (
                    <div className="mt-1 flex items-center text-xs text-gray-500">
                      <Phone className="h-3 w-3 mr-1" />
                      {appointment.patient_phone}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {appointments.length > 5 && (
              <div className="text-center pt-2">
                <Link href="/dashboard/agenda">
                  <Button variant="ghost" size="sm">
                    Ver mais {appointments.length - 5} consultas
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}