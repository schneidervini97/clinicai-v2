'use client'

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Palette, Clock, DollarSign, FileText, AlertTriangle, Edit } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import {
  updateConsultationTypeSchema,
  UpdateConsultationTypeInput,
  ConsultationType,
  CONSULTATION_TYPE_COLORS
} from '@/features/appointments/types/consultation-types'

interface EditConsultationTypeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  consultationType: ConsultationType
  onEdit: (id: string, data: UpdateConsultationTypeInput) => Promise<void>
  loading: boolean
}

export function EditConsultationTypeDialog({
  open,
  onOpenChange,
  consultationType,
  onEdit,
  loading
}: EditConsultationTypeDialogProps) {
  const [selectedColor, setSelectedColor] = useState(consultationType.color)

  const form = useForm<UpdateConsultationTypeInput>({
    resolver: zodResolver(updateConsultationTypeSchema),
    defaultValues: {
      name: consultationType.name,
      description: consultationType.description || '',
      duration: consultationType.duration,
      price: consultationType.price || undefined,
      color: consultationType.color,
      requires_preparation: consultationType.requires_preparation,
      preparation_instructions: consultationType.preparation_instructions || '',
      is_default: consultationType.is_default,
      active: consultationType.active,
    },
  })

  // Update form when consultation type changes
  useEffect(() => {
    if (consultationType) {
      form.reset({
        name: consultationType.name,
        description: consultationType.description || '',
        duration: consultationType.duration,
        price: consultationType.price || undefined,
        color: consultationType.color,
        requires_preparation: consultationType.requires_preparation,
        preparation_instructions: consultationType.preparation_instructions || '',
        is_default: consultationType.is_default,
        active: consultationType.active,
      })
      setSelectedColor(consultationType.color)
    }
  }, [consultationType, form])

  const handleSubmit = async (data: UpdateConsultationTypeInput) => {
    await onEdit(consultationType.id, data)
    onOpenChange(false)
  }

  const watchRequiresPreparation = form.watch('requires_preparation')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar Tipo de Consulta
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Informações Básicas</h3>
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Tipo *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Consulta, Retorno, Exame"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descreva o tipo de consulta..."
                        className="h-20"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Time and Price Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Duração e Preço
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duração (minutos) *</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a duração" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="15">15 minutos</SelectItem>
                          <SelectItem value="30">30 minutos</SelectItem>
                          <SelectItem value="45">45 minutos</SelectItem>
                          <SelectItem value="60">1 hora</SelectItem>
                          <SelectItem value="90">1h 30min</SelectItem>
                          <SelectItem value="120">2 horas</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço (R$)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        Deixe vazio se não houver preço padrão
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Color Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Cor para o Calendário
              </h3>
              
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="grid grid-cols-5 gap-3">
                        {CONSULTATION_TYPE_COLORS.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => {
                              field.onChange(color.value)
                              setSelectedColor(color.value)
                            }}
                            className={`
                              w-full h-12 rounded-lg border-2 transition-all
                              ${field.value === color.value 
                                ? 'border-primary shadow-md scale-105' 
                                : 'border-gray-200 hover:border-gray-300'
                              }
                            `}
                            style={{ backgroundColor: color.value }}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Cor selecionada: {CONSULTATION_TYPE_COLORS.find(c => c.value === field.value)?.name}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Preparation Requirements */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Preparação do Paciente
              </h3>
              
              <FormField
                control={form.control}
                name="requires_preparation"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Requer Preparação
                      </FormLabel>
                      <FormDescription>
                        Este tipo de consulta necessita de preparação especial do paciente
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {watchRequiresPreparation && (
                <FormField
                  control={form.control}
                  name="preparation_instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instruções de Preparação</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Ex: Jejum de 8 horas, trazer exames anteriores..."
                          className="h-20"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Estas instruções serão exibidas ao agendar a consulta
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Configurações</h3>
              
              <FormField
                control={form.control}
                name="is_default"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Tipo Padrão
                      </FormLabel>
                      <FormDescription>
                        Este tipo será selecionado automaticamente ao criar novos agendamentos
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Ativo
                      </FormLabel>
                      <FormDescription>
                        Apenas tipos ativos aparecem na seleção de agendamentos
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}