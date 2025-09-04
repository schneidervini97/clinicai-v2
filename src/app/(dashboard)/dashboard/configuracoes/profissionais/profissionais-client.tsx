'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, MoreVertical, User, Stethoscope, Mail, Phone, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

import { ProfessionalService } from '@/features/appointments/services/professional.service'
import { createClient } from '@/lib/supabase/client'
import { Professional } from '@/features/appointments/types/appointment.types'

interface ProfessionalsPageClientProps {
  initialProfessionals: Professional[]
}

export function ProfessionalsPageClient({ initialProfessionals }: ProfessionalsPageClientProps) {
  const router = useRouter()
  const [professionals, setProfessionals] = useState<Professional[]>(initialProfessionals)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  // Filter professionals based on search query
  const filteredProfessionals = professionals.filter(professional =>
    professional.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (professional.specialty && professional.specialty.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (professional.registration_number && professional.registration_number.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleToggleActive = async (professional: Professional) => {
    try {
      setLoading(true)
      const updatedProfessional = await ProfessionalService.update(
        professional.id,
        { active: !professional.active },
        supabase
      )

      setProfessionals(prev =>
        prev.map(p => p.id === professional.id ? updatedProfessional : p)
      )

      toast.success(
        updatedProfessional.active 
          ? 'Profissional ativado com sucesso!' 
          : 'Profissional desativado com sucesso!'
      )
    } catch (error) {
      console.error('Error toggling professional status:', error)
      toast.error('Erro ao alterar status do profissional')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (professional: Professional) => {
    if (!confirm(`Tem certeza que deseja excluir o profissional "${professional.name}"? Esta ação não pode ser desfeita.`)) {
      return
    }

    try {
      setLoading(true)
      await ProfessionalService.delete(professional.id, supabase)
      
      setProfessionals(prev => prev.filter(p => p.id !== professional.id))
      toast.success('Profissional excluído com sucesso!')
    } catch (error) {
      console.error('Error deleting professional:', error)
      toast.error('Erro ao excluir profissional')
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/configuracoes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Profissionais</h1>
            <p className="text-muted-foreground">
              Gerencie médicos, dentistas e outros profissionais da clínica
            </p>
          </div>
        </div>

        <Link href="/dashboard/configuracoes/profissionais/novo">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Profissional
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, especialidade ou registro..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Professionals List */}
      {filteredProfessionals.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {professionals.length === 0 ? 'Nenhum profissional cadastrado' : 'Nenhum profissional encontrado'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {professionals.length === 0 
                  ? 'Cadastre profissionais para começar a criar agendamentos.' 
                  : 'Tente ajustar sua busca para encontrar o profissional desejado.'
                }
              </p>
              {professionals.length === 0 && (
                <Link href="/dashboard/configuracoes/profissionais/novo">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Cadastrar Primeiro Profissional
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProfessionals.map((professional) => (
            <Card key={professional.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(professional.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg truncate">{professional.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={professional.active ? 'default' : 'secondary'}>
                          {professional.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                        {professional.specialty && (
                          <Badge variant="outline" className="text-xs">
                            {professional.specialty}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/configuracoes/profissionais/${professional.id}`}>
                          Ver detalhes
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/configuracoes/profissionais/${professional.id}/editar`}>
                          Editar
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/configuracoes/profissionais/${professional.id}/horarios`}>
                          Configurar horários
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleToggleActive(professional)}
                        disabled={loading}
                      >
                        {professional.active ? 'Desativar' : 'Ativar'}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => handleDelete(professional)}
                        disabled={loading}
                      >
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-2">
                  {professional.registration_number && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Stethoscope className="h-3 w-3" />
                      <span>{professional.registration_number}</span>
                    </div>
                  )}
                  
                  {professional.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{professional.email}</span>
                    </div>
                  )}
                  
                  {professional.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{professional.phone}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}