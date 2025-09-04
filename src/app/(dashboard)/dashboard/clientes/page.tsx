import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Eye, Edit } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PatientService } from '@/features/patients/services/patient.service'
import { formatDate } from '@/lib/masks'

export const metadata: Metadata = {
  title: 'Pacientes | Clínicas System',
  description: 'Gerenciar pacientes da clínica',
}

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Buscar pacientes
  let patients = []
  let error = null
  try {
    const result = await PatientService.search({}, { per_page: 50 }, supabase)
    patients = result.data
  } catch (err) {
    error = err instanceof Error ? err.message : 'Erro ao buscar pacientes'
    console.error('Error fetching patients:', err)
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

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pacientes</h2>
          <p className="text-muted-foreground">
            Gerencie os pacientes da sua clínica
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/clientes/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo Paciente
          </Link>
        </Button>
      </div>

      {error ? (
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-semibold text-destructive">Erro ao carregar pacientes</h3>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      ) : patients.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-semibold">Nenhum paciente encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Você ainda não tem pacientes cadastrados.
            </p>
            <Button asChild>
              <Link href="/dashboard/clientes/novo">
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Primeiro Paciente
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Pacientes ({patients.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">{patient.name}</h4>
                      <Badge className={statusColors[patient.status]}>
                        {statusLabels[patient.status]}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex gap-4">
                        <span>📞 {patient.phone}</span>
                        {patient.email && <span>✉️ {patient.email}</span>}
                      </div>
                      <div>
                        Cadastrado em {formatDate(patient.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/clientes/${patient.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/clientes/${patient.id}/editar`}>
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}