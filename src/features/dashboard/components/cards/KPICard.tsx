"use client"

// KPI Card Component with trend indicators
// Displays key performance indicators with change percentage and trend arrows

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus, LucideIcon, BarChart3, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"

interface KPICardProps {
  title: string
  value: string | number
  change?: number
  trend?: 'up' | 'down' | 'stable'
  subtitle?: string
  period?: string
  className?: string
  loading?: boolean
}

export function KPICard({
  title,
  value,
  change,
  trend = 'stable',
  subtitle,
  period,
  className,
  loading = false
}: KPICardProps) {
  // Choose icon based on title
  const getIcon = () => {
    const titleLower = title.toLowerCase()
    if (titleLower.includes('receita') || titleLower.includes('revenue')) return DollarSign
    if (titleLower.includes('ocupação') || titleLower.includes('taxa')) return BarChart3
    return TrendingUp // default
  }
  
  const Icon = getIcon()
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3" />
      case 'down':
        return <TrendingDown className="h-3 w-3" />
      default:
        return <Minus className="h-3 w-3" />
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600 bg-green-100'
      case 'down':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="h-4 w-24 bg-gray-200 rounded"></div>
          <div className="h-4 w-4 bg-gray-200 rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="h-8 w-20 bg-gray-200 rounded mb-2"></div>
          <div className="h-3 w-16 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        
        <div className="flex items-center justify-between mt-2">
          {/* Change indicator */}
          {change !== undefined && (
            <Badge 
              variant="secondary" 
              className={cn("text-xs", getTrendColor())}
            >
              {getTrendIcon()}
              <span className="ml-1">
                {change > 0 ? '+' : ''}{change.toFixed(1)}%
              </span>
            </Badge>
          )}
          
          {/* Period or subtitle */}
          {(period || subtitle) && (
            <p className="text-xs text-muted-foreground">
              {period || subtitle}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}