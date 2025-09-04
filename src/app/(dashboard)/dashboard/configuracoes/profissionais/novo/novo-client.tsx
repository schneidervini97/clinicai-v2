'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { ProfessionalForm } from '@/features/appointments/components/forms/professional-form'
import { ProfessionalService } from '@/features/appointments/services/professional.service'
import { createClient } from '@/lib/supabase/client'
import { CreateProfessionalInput } from '@/features/appointments/types/appointment.types'

export function NewProfessionalPageClient() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (data: CreateProfessionalInput) => {
    setIsSubmitting(true)
    try {
      const professional = await ProfessionalService.create(data, supabase)
      toast.success('Profissional cadastrado com sucesso!')
      router.push(`/dashboard/configuracoes/profissionais/${professional.id}`)
    } catch (error) {
      console.error('Error creating professional:', error)
      toast.error(
        error instanceof Error 
          ? error.message 
          : 'Erro ao cadastrar profissional'
      )
      throw error // Re-throw to prevent form from clearing
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push('/dashboard/configuracoes/profissionais')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/configuracoes/profissionais">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Plus className="h-8 w-8" />
            Novo Profissional
          </h1>
          <p className="text-muted-foreground">
            Cadastre um novo profissional para atender na clínica
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
            submitLabel="Cadastrar Profissional"
          />
        </CardContent>
      </Card>
    </div>
  )
}