import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ConsultationTypeService } from '@/features/appointments/services/consultation-type.service'
import { ConsultationTypesPageClient } from './consultation-types-client'

export const metadata: Metadata = {
  title: 'Tipos de Consulta',
  description: 'Configure os tipos de consulta disponíveis na clínica'
}

export default async function ConsultationTypesPage() {
  const supabase = await createClient()

  try {
    const consultationTypes = await ConsultationTypeService.list({}, { per_page: 100 }, supabase)

    return (
      <ConsultationTypesPageClient
        initialConsultationTypes={consultationTypes}
      />
    )
  } catch (error) {
    console.error('Error loading consultation types page:', error)
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-muted-foreground">
          <p>Erro ao carregar tipos de consulta.</p>
          <p>Tente recarregar a página.</p>
        </div>
      </div>
    )
  }
}