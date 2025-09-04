import { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PatientForm } from '@/features/patients/components/patient-form'
import { PatientService } from '@/features/patients/services/patient.service'
import { PatientFormData } from '@/features/patients/types/patient.schema'

interface EditPatientPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: EditPatientPageProps): Promise<Metadata> {
  try {
    const { id } = await params
    const supabase = await createClient()
    const patient = await PatientService.findById(id, supabase)
    return {
      title: patient ? `Editar ${patient.name} | Pacientes` : 'Editar Paciente',
      description: patient ? `Editar informações do paciente ${patient.name}` : 'Editar paciente',
    }
  } catch {
    return {
      title: 'Editar Paciente',
      description: 'Editar informações do paciente',
    }
  }
}

export default async function EditPatientPage({ params }: EditPatientPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { id } = await params
  let patient
  try {
    patient = await PatientService.findById(id, supabase)
  } catch (error) {
    console.error('Error fetching patient:', error)
    notFound()
  }

  if (!patient) {
    notFound()
  }

  async function handleUpdatePatient(data: PatientFormData) {
    'use server'
    
    let updatedPatient
    try {
      const supabase = await createClient()
      updatedPatient = await PatientService.update(id, data, supabase)
    } catch (error: unknown) {
      console.error('Error updating patient:', error)
      throw new Error(error instanceof Error ? error.message : 'Erro ao atualizar paciente')
    }
    
    // Redirect outside of try/catch as per Next.js documentation
    redirect(`/dashboard/clientes/${updatedPatient.id}`)
  }

  // Preparar dados para o formulário
  const defaultValues: Partial<PatientFormData> = {
    name: patient.name,
    phone: patient.phone,
    email: patient.email || undefined,
    cpf: patient.cpf || undefined,
    rg: patient.rg || undefined,
    birth_date: patient.birth_date || undefined,
    gender: patient.gender || undefined,
    status: patient.status,
    address: patient.address || undefined,
    address_number: patient.address_number || undefined,
    address_complement: patient.address_complement || undefined,
    neighborhood: patient.neighborhood || undefined,
    city: patient.city || undefined,
    state: patient.state || undefined,
    cep: patient.cep || undefined,
    media_origin: patient.media_origin || undefined,
    blood_type: patient.blood_type || undefined,
    health_insurance: patient.health_insurance || undefined,
    health_insurance_number: patient.health_insurance_number || undefined,
    allergies: patient.allergies || [],
    current_medications: patient.current_medications || [],
    medical_notes: patient.medical_notes || undefined,
    emergency_contact_name: patient.emergency_contact_name || undefined,
    emergency_contact_phone: patient.emergency_contact_phone || undefined,
    tags: patient.tags || [],
    lgpd_consent: patient.lgpd_consent,
    whatsapp_consent: patient.whatsapp_consent,
    email_marketing_consent: patient.email_marketing_consent,
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PatientForm 
        defaultValues={defaultValues}
        onSubmit={handleUpdatePatient}
        title={`Editar ${patient.name}`}
        description="Atualize as informações do paciente"
        submitText="Atualizar Paciente"
      />
    </div>
  )
}