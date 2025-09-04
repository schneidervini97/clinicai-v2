'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Phone, User, Calendar } from 'lucide-react'
import { PipelinePatient } from '../types/pipeline.types'

interface PipelineCardProps {
  patient: PipelinePatient
  onClick?: () => void
  isDragging?: boolean
}

export function PipelineCard({ 
  patient, 
  onClick,
  isDragging = false 
}: PipelineCardProps) {
  const getDaysColor = (days: number) => {
    if (days <= 3) return 'bg-green-100 text-green-800'
    if (days <= 7) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const formatPhone = (phone: string) => {
    if (!phone) return ''
    // Simple phone formatting for display
    return phone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3')
  }

  return (
    <Card 
      className={`p-3 mb-2 cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 border-l-primary/20 ${
        isDragging ? 'opacity-50 rotate-2 shadow-lg' : ''
      }`}
      onClick={onClick}
    >
      <div className="space-y-2">
        {/* Header with name and days */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-sm truncate flex items-center gap-1">
              <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              {patient.name}
            </h4>
          </div>
          <Badge 
            variant="secondary" 
            className={`text-xs px-2 py-1 ${getDaysColor(patient.days_in_stage || 0)}`}
          >
            {patient.days_in_stage || 0}d
          </Badge>
        </div>

        {/* Contact info */}
        <div className="space-y-1">
          {patient.phone && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span className="truncate">{formatPhone(patient.phone)}</span>
            </div>
          )}
          
          {patient.birth_date && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>
                {new Date().getFullYear() - new Date(patient.birth_date).getFullYear()} anos
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1 pt-1">
          {patient.phone && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation()
                window.open(`https://wa.me/55${patient.phone.replace(/\D/g, '')}`, '_blank')
              }}
            >
              WhatsApp
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation()
              // Navigate to patient details
              window.location.href = `/dashboard/clientes/${patient.id}`
            }}
          >
            Ver Perfil
          </Button>
        </div>
      </div>
    </Card>
  )
}