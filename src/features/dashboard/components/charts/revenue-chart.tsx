"use client"

// Gráfico de Receita Mensal
// Exibe evolução da receita ao longo dos meses com data

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import { RevenueChartData } from "../../types/dashboard.types"

interface RevenueChartProps {
  data: RevenueChartData[]
  loading?: boolean
}

export function RevenueChart({ data, loading = false }: RevenueChartProps) {
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatTooltipLabel = (label: string) => {
    // Converte "2024-01" para "Jan 2024"
    try {
      const [year, month] = label.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 1, 1)
      return new Intl.DateTimeFormat('pt-BR', {
        month: 'short',
        year: 'numeric'
      }).format(date)
    } catch {
      return label
    }
  }

  const formatXAxisLabel = (value: string) => {
    // Converte "2024-01" para "Jan"
    try {
      const [, month] = value.split('-')
      const date = new Date(2024, parseInt(month) - 1, 1)
      return new Intl.DateTimeFormat('pt-BR', {
        month: 'short'
      }).format(date)
    } catch {
      return value
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receita Mensal</CardTitle>
        <CardDescription>
          Evolução da receita nos últimos 12 meses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="month" 
              stroke="#666"
              fontSize={12}
              tickFormatter={formatXAxisLabel}
            />
            <YAxis 
              stroke="#666"
              fontSize={12}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip
              labelFormatter={formatTooltipLabel}
              formatter={(value: number) => [formatCurrency(value), "Receita"]}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}