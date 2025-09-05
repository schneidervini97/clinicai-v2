'use client'

import React, { useState } from 'react'
import { Plus, Settings, Calendar, Clock, DollarSign, Palette, Users, Trash2, Edit, Star } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

import { ConsultationTypeService } from '@/features/appointments/services/consultation-type.service'
import { createClient } from '@/lib/supabase/client'
import { ConsultationType, formatPrice, formatDuration } from '@/features/appointments/types/consultation-types'
import { CreateConsultationTypeDialog } from './create-consultation-type-dialog'
import { EditConsultationTypeDialog } from './edit-consultation-type-dialog'

interface ConsultationTypesPageClientProps {
  initialConsultationTypes: ConsultationType[]
}

export function ConsultationTypesPageClient({
  initialConsultationTypes
}: ConsultationTypesPageClientProps) {
  const [consultationTypes, setConsultationTypes] = useState<ConsultationType[]>(initialConsultationTypes)
  const [loading, setLoading] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<ConsultationType | null>(null)
  
  const supabase = createClient()

  const handleCreate = async (data: any) => {
    try {
      setLoading(true)
      const newType = await ConsultationTypeService.create(data, supabase)
      setConsultationTypes(prev => [...prev, newType])
      toast.success('Tipo de consulta criado com sucesso!')
    } catch (error) {
      console.error('Error creating consultation type:', error)
      toast.error('Erro ao criar tipo de consulta')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async (id: string, data: any) => {
    try {
      setLoading(true)
      const updatedType = await ConsultationTypeService.update(id, data, supabase)
      setConsultationTypes(prev => 
        prev.map(type => type.id === id ? updatedType : type)
      )
      toast.success('Tipo de consulta atualizado!')
    } catch (error) {
      console.error('Error updating consultation type:', error)
      toast.error('Erro ao atualizar tipo de consulta')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setLoading(true)
      await ConsultationTypeService.delete(id, supabase)
      setConsultationTypes(prev => prev.filter(type => type.id !== id))
      toast.success('Tipo de consulta removido!')
    } catch (error) {
      console.error('Error deleting consultation type:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao remover tipo de consulta')
    } finally {
      setLoading(false)
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      setLoading(true)
      await ConsultationTypeService.setAsDefault(id, supabase)
      setConsultationTypes(prev => 
        prev.map(type => ({
          ...type,
          is_default: type.id === id
        }))
      )
      toast.success('Tipo padrão atualizado!')
    } catch (error) {
      console.error('Error setting default consultation type:', error)
      toast.error('Erro ao definir tipo padrão')
    } finally {
      setLoading(false)
    }
  }

  const activeTypes = consultationTypes.filter(type => type.active)
  const inactiveTypes = consultationTypes.filter(type => !type.active)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Tipos de Consulta
          </h1>
          <p className="text-muted-foreground">
            Configure os diferentes tipos de consulta oferecidos pela clínica
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} disabled={loading}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Tipo
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Tipos</p>
                <p className="text-2xl font-bold">{consultationTypes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Tipos Ativos</p>
                <p className="text-2xl font-bold">{activeTypes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Active Consultation Types */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Tipos Ativos</h2>
        {activeTypes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">Nenhum tipo de consulta ativo</p>
              <p>Crie seu primeiro tipo de consulta para começar</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTypes.map((type) => (
              <Card key={type.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: type.color }}
                      />
                      <CardTitle className="text-lg flex items-center gap-2">
                        {type.name}
                        {type.is_default && (
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        )}
                      </CardTitle>
                    </div>
                    <Badge variant={type.active ? 'default' : 'secondary'}>
                      {type.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {type.description && (
                    <p className="text-sm text-muted-foreground">
                      {type.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span>{formatDuration(type.duration)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span>{formatPrice(type.price)}</span>
                    </div>
                  </div>

                  {type.requires_preparation && (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-sm font-medium text-amber-800 mb-1">
                        Requer Preparação
                      </p>
                      {type.preparation_instructions && (
                        <p className="text-sm text-amber-700">
                          {type.preparation_instructions}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedType(type)
                        setEditDialogOpen(true)
                      }}
                      disabled={loading}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>


                    {!type.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(type.id)}
                        disabled={loading}
                        title="Definir como padrão"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover tipo de consulta</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja remover "{type.name}"? 
                            Esta ação não pode ser desfeita e não será possível se houver agendamentos vinculados.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(type.id)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Inactive Types */}
      {inactiveTypes.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Tipos Inativos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {inactiveTypes.map((type) => (
              <Card key={type.id} className="opacity-60">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: type.color }}
                      />
                      <CardTitle className="text-lg">{type.name}</CardTitle>
                    </div>
                    <Badge variant="secondary">Inativo</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(type.id, { active: true })}
                      disabled={loading}
                    >
                      Reativar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CreateConsultationTypeDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleCreate}
        loading={loading}
      />

      {selectedType && (
        <>
          <EditConsultationTypeDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            consultationType={selectedType}
            onEdit={handleEdit}
            loading={loading}
          />

        </>
      )}
    </div>
  )
}