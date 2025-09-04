'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit3 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { ProfessionalForm } from '@/features/appointments/components/forms/professional-form'
import { ProfessionalService } from '@/features/appointments/services/professional.service'
import { createClient } from '@/lib/supabase/client'
import { Professional, UpdateProfessionalInput } from '@/features/appointments/types/appointment.types'

interface EditProfessionalPageClientProps {
  professional: Professional
}

export function EditProfessionalPageClient({ professional }: EditProfessionalPageClientProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (data: UpdateProfessionalInput) => {
    setIsSubmitting(true)
    try {
      await ProfessionalService.update(professional.id, data, supabase)
      toast.success('Profissional atualizado com sucesso!')
      router.push(`/dashboard/configuracoes/profissionais/${professional.id}`)
    } catch (error) {
      console.error('Error updating professional:', error)
      toast.error(
        error instanceof Error 
          ? error.message 
          : 'Erro ao atualizar profissional'
      )
      throw error // Re-throw to prevent form from clearing
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push(`/dashboard/configuracoes/profissionais/${professional.id}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/configuracoes/profissionais/${professional.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Edit3 className="h-8 w-8" />
            Editar Profissional
          </h1>
          <p className="text-muted-foreground">
            Edite os dados de {professional.name}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do Profissional</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfessionalForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            submitLabel="Salvar Alterações"
            defaultValues={{
              name: professional.name,
              email: professional.email || '',
              phone: professional.phone || '',
              specialty: professional.specialty || '',
              registration_number: professional.registration_number || ''
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}