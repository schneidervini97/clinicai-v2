"use client"

// Gráfico de Consultas por Período
// Exibe evolução das consultas agendadas vs realizadas

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts"
import { AppointmentChartData } from "../../types/dashboard.types"

interface AppointmentsChartProps {
  data: AppointmentChartData[]
  loading?: boolean
}

export function AppointmentsChart({ data, loading = false }: AppointmentsChartProps) {
  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
          <div className="h-3 w-48 bg-gray-200 rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    )
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr + 'T00:00:00')
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short'
      }).format(date)
    } catch {
      return dateStr
    }
  }

  const formatTooltipLabel = (label: string) => {
    try {
      const date = new Date(label + 'T00:00:00')
      return new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }).format(date)
    } catch {
      return label
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consultas por Período</CardTitle>
        <CardDescription>
          Comparação entre consultas agendadas e realizadas nos últimos 30 dias
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#666"
              fontSize={12}
              tickFormatter={formatDate}
            />
            <YAxis 
              stroke="#666"
              fontSize={12}
            />
            <Tooltip
              labelFormatter={formatTooltipLabel}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
              formatter={(value: number, name: string) => {
                const labels = {
                  scheduled: 'Agendadas',
                  completed: 'Realizadas',
                  cancelled: 'Canceladas',
                  noShow: 'Não compareceu'
                }
                return [value, labels[name as keyof typeof labels] || name]
              }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => {
                const labels = {
                  scheduled: 'Agendadas',
                  completed: 'Realizadas',
                  cancelled: 'Canceladas',
                  noShow: 'Não compareceu'
                }
                return labels[value as keyof typeof labels] || value
              }}
            />
            <Bar dataKey="scheduled" fill="#3b82f6" name="scheduled" />
            <Bar dataKey="completed" fill="#10b981" name="completed" />
            <Bar dataKey="cancelled" fill="#f59e0b" name="cancelled" />
            <Bar dataKey="noShow" fill="#ef4444" name="noShow" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}