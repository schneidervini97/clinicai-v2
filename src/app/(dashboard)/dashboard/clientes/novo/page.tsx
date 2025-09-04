import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PatientForm } from '@/features/patients/components/patient-form'
import { PatientService } from '@/features/patients/services/patient.service'
import { PatientFormData } from '@/features/patients/types/patient.schema'

export const metadata: Metadata = {
  title: 'Novo Paciente | Clínicas System',
  description: 'Cadastrar novo paciente',
}

export default async function NovoClientePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  async function handleCreatePatient(data: PatientFormData) {
    'use server'
    
    let patient
    try {
      const supabase = await createClient()
      patient = await PatientService.create(data, supabase)
    } catch (error: unknown) {
      console.error('Error creating patient:', error)
      throw new Error(error instanceof Error ? error.message : 'Erro ao criar paciente')
    }
    
    // Redirect outside of try/catch as per Next.js documentation
    redirect(`/dashboard/clientes/${patient.id}`)
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PatientForm 
        onSubmit={handleCreatePatient}
        title="Novo Paciente"
        description="Preencha as informações do novo paciente"
        submitText="Criar Paciente"
      />
    </div>
  )
}