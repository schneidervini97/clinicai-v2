'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Eye, Edit, Trash2, Filter } from 'lucide-react'
import { Patient, MEDIA_ORIGINS } from '@/features/patients/types/patient.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { formatDate, formatCPF, formatPhone } from '@/lib/masks'

interface ClientesPageClientProps {
  initialPatients: Patient[]
}

export function ClientesPageClient({ initialPatients }: ClientesPageClientProps) {
  const [patients, setPatients] = useState(initialPatients)
  const [searchTerm, setSearchTerm] = useState('')
  const [mediaOriginFilter, setMediaOriginFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleting, setDeleting] = useState<string | null>(null)

  // Filter patients based on search and filters
  const filteredPatients = patients.filter((patient) => {
    const matchesSearch = !searchTerm || 
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.phone.includes(searchTerm) ||
      (patient.cpf && patient.cpf.includes(searchTerm.replace(/\D/g, ''))) ||
      (patient.email && patient.email.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesMediaOrigin = mediaOriginFilter === 'all' || 
      patient.media_origin === mediaOriginFilter ||
      (mediaOriginFilter === 'none' && (!patient.media_origin || patient.media_origin === ''))

    const matchesStatus = statusFilter === 'all' || patient.status === statusFilter

    return matchesSearch && matchesMediaOrigin && matchesStatus
  })

  const handleDelete = async (patientId: string, patientName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o paciente ${patientName}? Esta ação não pode ser desfeita.`)) {
      return
    }

    setDeleting(patientId)
    
    try {
      const response = await fetch(`/api/patients/${patientId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Erro ao excluir paciente')
      }

      // Remove patient from local state
      setPatients(prev => prev.filter(p => p.id !== patientId))
    } catch (error) {
      console.error('Error deleting patient:', error)
      alert('Erro ao excluir paciente. Tente novamente.')
    } finally {
      setDeleting(null)
    }
  }

  const statusColors = {
    active: 'bg-green-100 text-green-800 hover:bg-green-100',
    inactive: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
    archived: 'bg-red-100 text-red-800 hover:bg-red-100',
  }

  const statusLabels = {
    active: 'Ativo',
    inactive: 'Inativo',
    archived: 'Arquivado',
  }

  // Criar um mapeamento dos valores do banco para labels amigáveis
  const getMediaOriginLabel = (origin: string) => {
    return origin || '-'
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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Buscar</label>
              <Input
                placeholder="Nome, telefone, CPF ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Origem</label>
              <Select value={mediaOriginFilter} onValueChange={setMediaOriginFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as origens" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as origens</SelectItem>
                  <SelectItem value="none">Sem origem</SelectItem>
                  {MEDIA_ORIGINS.map((origin) => (
                    <SelectItem key={origin} value={origin}>
                      {origin}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="archived">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Resultados</label>
              <div className="flex items-center h-9 px-3 py-1 text-sm border rounded-md bg-muted">
                {filteredPatients.length} paciente{filteredPatients.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pacientes ({filteredPatients.length})</CardTitle>
          <CardDescription>
            Lista de todos os pacientes cadastrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPatients.length === 0 ? (
            <div className="text-center py-8">
              <h3 className="text-lg font-semibold mb-2">
                {patients.length === 0 ? 'Nenhum paciente encontrado' : 'Nenhum resultado encontrado'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {patients.length === 0 
                  ? 'Você ainda não tem pacientes cadastrados.'
                  : 'Tente ajustar os filtros ou termos de busca.'
                }
              </p>
              {patients.length === 0 && (
                <Button asChild>
                  <Link href="/dashboard/clientes/novo">
                    <Plus className="mr-2 h-4 w-4" />
                    Cadastrar Primeiro Paciente
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastrado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold">{patient.name}</div>
                          {patient.email && (
                            <div className="text-sm text-muted-foreground">{patient.email}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatPhone(patient.phone)}</TableCell>
                      <TableCell>
                        {patient.cpf ? formatCPF(patient.cpf) : '-'}
                      </TableCell>
                      <TableCell>
                        {patient.media_origin ? (
                          <Badge variant="outline">
                            {getMediaOriginLabel(patient.media_origin)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[patient.status]}>
                          {statusLabels[patient.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(patient.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/dashboard/clientes/${patient.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/dashboard/clientes/${patient.id}/editar`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                disabled={deleting === patient.id}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o paciente &ldquo;{patient.name}&rdquo;? 
                                  Esta ação não pode ser desfeita e todos os dados associados serão perdidos.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(patient.id, patient.name)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}