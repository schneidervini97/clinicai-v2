"use client"

// Widget de Aniversariantes do Mês
// Lista pacientes que fazem aniversário neste mês

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Cake, Gift, Phone, Calendar } from "lucide-react"
import { DashboardPatient } from "../../types/dashboard.types"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import Link from "next/link"

interface BirthdaysWidgetProps {
  patients: DashboardPatient[]
  loading?: boolean
}

export function BirthdaysWidget({ patients, loading = false }: BirthdaysWidgetProps) {
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

  const formatBirthday = (birthDate: string) => {
    try {
      const date = new Date(birthDate + 'T00:00:00')
      return format(date, 'dd/MM', { locale: ptBR })
    } catch {
      return birthDate
    }
  }

  const getDaysUntilBirthday = (patient: DashboardPatient) => {
    if (patient.days_until_birthday === undefined) return null
    
    const days = patient.days_until_birthday
    if (days === 0) return "Hoje!"
    if (days === 1) return "Amanhã"
    if (days < 7) return `Em ${days} dias`
    return `${Math.ceil(days / 7)} semana${days > 14 ? 's' : ''}`
  }

  const getBirthdayIcon = (patient: DashboardPatient) => {
    if (patient.days_until_birthday === 0) {
      return <Gift className="h-4 w-4 text-yellow-600" />
    }
    return <Cake className="h-4 w-4 text-pink-600" />
  }

  const getBirthdayColor = (patient: DashboardPatient) => {
    const days = patient.days_until_birthday || 0
    if (days === 0) return "bg-yellow-100 text-yellow-800"
    if (days <= 7) return "bg-pink-100 text-pink-800"
    return "bg-blue-100 text-blue-800"
  }

  // Ordena por dias até aniversário (hoje primeiro, depois por proximidade)
  const sortedPatients = [...patients].sort((a, b) => {
    const daysA = a.days_until_birthday || 999
    const daysB = b.days_until_birthday || 999
    return daysA - daysB
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          <Cake className="h-4 w-4 inline mr-2" />
          Aniversariantes do Mês
        </CardTitle>
        {patients.length > 0 && (
          <Link href="/dashboard/clientes">
            <Button variant="outline" size="sm">
              Ver todos
            </Button>
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {sortedPatients.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              Nenhum aniversariante neste mês
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedPatients.slice(0, 5).map((patient) => (
              <div
                key={patient.id}
                className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {getBirthdayIcon(patient)}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {patient.name}
                    </p>
                    <div className={`text-xs px-2 py-1 rounded-full ${getBirthdayColor(patient)}`}>
                      {getDaysUntilBirthday(patient)}
                    </div>
                  </div>
                  
                  <div className="mt-1 flex items-center text-sm text-gray-600">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span>
                      {patient.birth_date ? formatBirthday(patient.birth_date) : 'Data não informada'}
                    </span>
                  </div>
                  
                  {patient.phone && (
                    <div className="mt-1 flex items-center text-xs text-gray-500">
                      <Phone className="h-3 w-3 mr-1" />
                      {patient.phone}
                    </div>
                  )}
                  
                  <div className="mt-1 text-xs text-gray-500">
                    {patient.total_visits > 0 ? (
                      <span>{patient.total_visits} consulta{patient.total_visits > 1 ? 's' : ''}</span>
                    ) : (
                      <span>Novo paciente</span>
                    )}
                    {patient.last_visit && (
                      <span className="ml-2">• Última: {formatBirthday(patient.last_visit)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {sortedPatients.length > 5 && (
              <div className="text-center pt-2">
                <Link href="/dashboard/clientes">
                  <Button variant="ghost" size="sm">
                    Ver mais {sortedPatients.length - 5} aniversariantes
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