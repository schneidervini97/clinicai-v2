import { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, FileText, History, CreditCard } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { PatientService } from '@/features/patients/services/patient.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatDate, formatCurrency } from '@/lib/masks'

interface PatientPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PatientPageProps): Promise<Metadata> {
  try {
    const { id } = await params
    const supabase = await createClient()
    const patient = await PatientService.findById(id, supabase)
    return {
      title: patient ? `${patient.name} | Pacientes` : 'Paciente não encontrado',
      description: patient ? `Informações do paciente ${patient.name}` : 'Paciente não encontrado',
    }
  } catch {
    return {
      title: 'Paciente não encontrado',
      description: 'O paciente solicitado não foi encontrado',
    }
  }
}

export default async function PatientPage({ params }: PatientPageProps) {
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

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-yellow-100 text-yellow-800',
    archived: 'bg-red-100 text-red-800',
  }

  const statusLabels = {
    active: 'Ativo',
    inactive: 'Inativo',
    archived: 'Arquivado',
  }

  const genderLabels = {
    male: 'Masculino',
    female: 'Feminino',
    other: 'Outro',
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/clientes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight">{patient.name}</h2>
            <Badge className={statusColors[patient.status]}>
              {statusLabels[patient.status]}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Cadastrado em {formatDate(patient.created_at)}
          </p>
        </div>
        <Button asChild>
          <Link href={`/dashboard/clientes/${patient.id}/editar`}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações Principais */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dados Básicos */}
          <Card>
            <CardHeader>
              <CardTitle>Dados Básicos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                  <p className="text-sm">{patient.phone}</p>
                </div>
                {patient.email && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-sm">{patient.email}</p>
                  </div>
                )}
                {patient.cpf && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">CPF</label>
                    <p className="text-sm">{patient.cpf}</p>
                  </div>
                )}
                {patient.rg && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">RG</label>
                    <p className="text-sm">{patient.rg}</p>
                  </div>
                )}
                {patient.birth_date && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Data de Nascimento</label>
                    <p className="text-sm">{formatDate(patient.birth_date)}</p>
                  </div>
                )}
                {patient.gender && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Gênero</label>
                    <p className="text-sm">{genderLabels[patient.gender]}</p>
                  </div>
                )}
                {patient.media_origin && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Origem de Mídia</label>
                    <p className="text-sm">{patient.media_origin}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Endereço */}
          {(patient.address || patient.city || patient.state) && (
            <Card>
              <CardHeader>
                <CardTitle>Endereço</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {patient.address && (
                    <p className="text-sm">
                      {patient.address}
                      {patient.address_number && `, ${patient.address_number}`}
                      {patient.address_complement && ` - ${patient.address_complement}`}
                    </p>
                  )}
                  {patient.neighborhood && (
                    <p className="text-sm">{patient.neighborhood}</p>
                  )}
                  <p className="text-sm">
                    {patient.city && patient.city}
                    {patient.state && patient.city && ', '}
                    {patient.state}
                    {patient.cep && ` - ${patient.cep}`}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dados Médicos */}
          {(patient.blood_type || patient.health_insurance || patient.allergies?.length || patient.current_medications?.length || patient.medical_notes) && (
            <Card>
              <CardHeader>
                <CardTitle>Dados Médicos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {patient.blood_type && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tipo Sanguíneo</label>
                      <p className="text-sm">{patient.blood_type}</p>
                    </div>
                  )}
                  {patient.health_insurance && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Convênio</label>
                      <p className="text-sm">
                        {patient.health_insurance}
                        {patient.health_insurance_number && ` - ${patient.health_insurance_number}`}
                      </p>
                    </div>
                  )}
                </div>
                
                {patient.allergies && patient.allergies.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Alergias</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {patient.allergies.map((allergy, index) => (
                        <Badge key={index} variant="destructive">
                          {allergy}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {patient.current_medications && patient.current_medications.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Medicamentos Atuais</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {patient.current_medications.map((medication, index) => (
                        <Badge key={index} variant="secondary">
                          {medication}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {patient.medical_notes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Observações Médicas</label>
                    <p className="text-sm whitespace-pre-wrap">{patient.medical_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Ações Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start" disabled>
                <FileText className="mr-2 h-4 w-4" />
                Documentos
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" disabled>
                <History className="mr-2 h-4 w-4" />
                Histórico
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" disabled>
                <CreditCard className="mr-2 h-4 w-4" />
                Financeiro
              </Button>
            </CardContent>
          </Card>

          {/* Contato de Emergência */}
          {(patient.emergency_contact_name || patient.emergency_contact_phone) && (
            <Card>
              <CardHeader>
                <CardTitle>Contato de Emergência</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {patient.emergency_contact_name && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nome</label>
                    <p className="text-sm">{patient.emergency_contact_name}</p>
                  </div>
                )}
                {patient.emergency_contact_phone && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                    <p className="text-sm">{patient.emergency_contact_phone}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {patient.tags && patient.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {patient.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Consentimentos */}
          <Card>
            <CardHeader>
              <CardTitle>Consentimentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">LGPD</span>
                <Badge variant={patient.lgpd_consent ? 'default' : 'secondary'}>
                  {patient.lgpd_consent ? 'Sim' : 'Não'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">WhatsApp</span>
                <Badge variant={patient.whatsapp_consent ? 'default' : 'secondary'}>
                  {patient.whatsapp_consent ? 'Sim' : 'Não'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Marketing</span>
                <Badge variant={patient.email_marketing_consent ? 'default' : 'secondary'}>
                  {patient.email_marketing_consent ? 'Sim' : 'Não'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}