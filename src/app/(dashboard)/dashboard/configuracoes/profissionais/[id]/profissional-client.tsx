'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Edit3, 
  Calendar, 
  Trash2, 
  User, 
  Mail, 
  Phone, 
  Stethoscope, 
  FileText,
  CheckCircle,
  XCircle,
  Settings
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
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

import { ProfessionalService } from '@/features/appointments/services/professional.service'
import { createClient } from '@/lib/supabase/client'
import { Professional } from '@/features/appointments/types/appointment.types'

interface ProfessionalDetailsClientProps {
  professional: Professional
}

export function ProfessionalDetailsClient({ professional: initialProfessional }: ProfessionalDetailsClientProps) {
  const router = useRouter()
  const [professional, setProfessional] = useState(initialProfessional)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

  const handleToggleStatus = async () => {
    try {
      setLoading(true)
      const updatedProfessional = await ProfessionalService.update(
        professional.id,
        { active: !professional.active },
        supabase
      )
      
      setProfessional(updatedProfessional)
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

  const handleDelete = async () => {
    try {
      setLoading(true)
      await ProfessionalService.delete(professional.id, supabase)
      toast.success('Profissional excluído com sucesso!')
      router.push('/dashboard/configuracoes/profissionais')
    } catch (error) {
      console.error('Error deleting professional:', error)
      toast.error('Erro ao excluir profissional')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/configuracoes/profissionais">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{professional.name}</h1>
            <p className="text-muted-foreground">
              Detalhes do profissional
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/dashboard/configuracoes/profissionais/${professional.id}/editar`}>
            <Button variant="outline">
              <Edit3 className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </Link>
          
          <Link href={`/dashboard/configuracoes/profissionais/${professional.id}/horarios`}>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Configurar Horários
            </Button>
          </Link>
        </div>
      </div>

      {/* Professional Info */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Main Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Profile Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                  {getInitials(professional.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">{professional.name}</h3>
                <Badge variant={professional.active ? 'default' : 'secondary'} className="mt-1">
                  {professional.active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Contact Info */}
            <div className="space-y-3">
              {professional.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{professional.email}</span>
                </div>
              )}
              
              {professional.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{professional.phone}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Professional Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Informações Profissionais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {professional.specialty && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Especialidade</label>
                <p className="text-sm mt-1">{professional.specialty}</p>
              </div>
            )}

            {professional.registration_number && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Registro Profissional</label>
                <div className="flex items-center gap-2 mt-1">
                  <FileText className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm">{professional.registration_number}</span>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="flex items-center gap-2 mt-1">
                {professional.active ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-gray-400" />
                )}
                <span className="text-sm">
                  {professional.active ? 'Disponível para agendamentos' : 'Não disponível para agendamentos'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Ações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={handleToggleStatus}
              disabled={loading}
              className={professional.active ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}
            >
              {professional.active ? (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Desativar Profissional
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Ativar Profissional
                </>
              )}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive hover:text-destructive" disabled={loading}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Profissional
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir profissional</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir o profissional "{professional.name}"? 
                    Esta ação não pode ser desfeita e todos os agendamentos associados serão afetados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}