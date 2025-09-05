"use client"

// Metric Card Component for simpler metrics display
// Used for basic statistics without trend indicators

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon, Users, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  description?: string
  className?: string
  loading?: boolean
  children?: React.ReactNode
}

export function MetricCard({
  title,
  value,
  subtitle,
  description,
  className,
  loading = false,
  children
}: MetricCardProps) {
  // Choose icon based on title
  const getIcon = () => {
    const titleLower = title.toLowerCase()
    if (titleLower.includes('paciente') || titleLower.includes('patient')) return Users
    if (titleLower.includes('consulta') || titleLower.includes('appointment')) return Calendar
    return Users // default
  }
  
  const Icon = getIcon()
  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="h-4 w-24 bg-gray-200 rounded"></div>
          <div className="h-4 w-4 bg-gray-200 rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="h-8 w-20 bg-gray-200 rounded mb-2"></div>
          <div className="h-3 w-32 bg-gray-200 rounded"></div>
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
        <Icon className={cn("h-4 w-4 text-muted-foreground")} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-2">{value}</div>
        
        {subtitle && (
          <p className="text-sm text-muted-foreground mb-1">
            {subtitle}
          </p>
        )}
        
        {description && (
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        )}
        
        {children && (
          <div className="mt-3">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  )
}