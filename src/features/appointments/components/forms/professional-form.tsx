'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Stethoscope, Mail, Phone, FileText, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

import { Professional, CreateProfessionalInput } from '../../types/appointment.types'
import { applyPhoneMask } from '@/lib/masks'

// Validation schema
const professionalSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  specialty: z.string().optional(),
  registration_number: z.string().optional(),
  active: z.boolean().default(true),
  notes: z.string().optional(),
})

type ProfessionalFormData = z.infer<typeof professionalSchema>

// Common medical specialties
const MEDICAL_SPECIALTIES = [
  'Cardiologia',
  'Dermatologia',
  'Endocrinologia',
  'Gastroenterologia',
  'Ginecologia',
  'Neurologia',
  'Oftalmologia',
  'Oncologia',
  'Ortopedia',
  'Pediatria',
  'Pneumologia',
  'Psiquiatria',
  'Urologia',
  'Clínica Geral',
  'Medicina Interna',
  'Cirurgia Geral',
  // Dental specialties
  'Odontologia',
  'Ortodontia',
  'Periodontia',
  'Endodontia',
  'Cirurgia Oral',
  'Prótese Dentária',
  // Other health professionals
  'Fisioterapia',
  'Psicologia',
  'Nutrição',
  'Enfermagem',
]

interface ProfessionalFormProps {
  professional?: Professional
  onSubmit: (data: CreateProfessionalInput) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  submitLabel?: string
}

export function ProfessionalForm({
  professional,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = 'Salvar'
}: ProfessionalFormProps) {
  const form = useForm<ProfessionalFormData>({
    resolver: zodResolver(professionalSchema),
    defaultValues: {
      name: professional?.name || '',
      email: professional?.email || '',
      phone: professional?.phone || '',
      specialty: professional?.specialty || '',
      registration_number: professional?.registration_number || '',
      active: professional?.active ?? true,
      notes: '',
    },
  })

  const handleSubmit = async (data: ProfessionalFormData) => {
    try {
      // Remove empty strings and convert to null for optional fields
      const processedData: CreateProfessionalInput = {
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        specialty: data.specialty || undefined,
        registration_number: data.registration_number || undefined,
        active: data.active,
      }

      await onSubmit(processedData)
    } catch (error) {
      console.error('Error submitting professional form:', error)
      // Error is handled by parent component
      throw error
    }
  }

  const handlePhoneChange = (value: string, onChange: (value: string) => void) => {
    const masked = applyPhoneMask(value)
    onChange(masked)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações Básicas
          </h3>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome Completo *</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Dr. João Silva" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="email@exemplo.com" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="(11) 99999-9999"
                        className="pl-10"
                        value={field.value || ''}
                        onChange={(e) => handlePhoneChange(e.target.value, field.onChange)}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Professional Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Informações Profissionais
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="specialty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Especialidade</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a especialidade" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MEDICAL_SPECIALTIES.map((specialty) => (
                        <SelectItem key={specialty} value={specialty}>
                          {specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Ou digite uma especialidade personalizada no campo acima
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="registration_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registro Profissional</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="CRM, CRO, CREFITO, etc."
                        className="pl-10" 
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Ex: CRM 123456/SP, CRO 12345, CREFITO 123456-F
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Status */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Status</h3>

          <FormField
            control={form.control}
            name="active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Profissional ativo
                  </FormLabel>
                  <FormDescription>
                    Profissionais ativos podem ter consultas agendadas
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}