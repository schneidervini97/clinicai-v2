import { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { ClinicService } from '@/features/clinic/services/clinic.service'
import { ClinicFormClient } from './clinic-form-client'

export const metadata: Metadata = {
  title: 'Dados da Clínica',
  description: 'Configure as informações básicas da sua clínica'
}

export default async function ClinicDataPage() {
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  try {
    // Get current clinic data
    const clinicData = await ClinicService.getByUserId(supabase)

    if (!clinicData) {
      // This shouldn't happen if user completed onboarding
      // but just in case, redirect to onboarding
      redirect('/onboarding/clinic-info')
    }

    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <ClinicFormClient initialData={clinicData} />
      </div>
    )
  } catch (error) {
    console.error('Error loading clinic data:', error)
    
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <h2 className="text-2xl font-bold">Erro ao Carregar Dados</h2>
          </div>
          <p className="text-muted-foreground mb-6">
            Não foi possível carregar os dados da clínica.
          </p>
          <div className="space-x-4">
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
            >
              Tentar Novamente
            </button>
            <a 
              href="/dashboard/configuracoes" 
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Voltar às Configurações
            </a>
          </div>
        </div>
      </div>
    )
  }
}