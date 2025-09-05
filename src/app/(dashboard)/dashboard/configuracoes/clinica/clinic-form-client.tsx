'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, Phone, MapPin, CheckCircle, Save, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'

import { ClinicService } from '@/features/clinic/services/clinic.service'
import { createClient } from '@/lib/supabase/client'
import { 
  ClinicData, 
  UpdateClinicFormData, 
  updateClinicSchema, 
  MEDICAL_SPECIALTIES 
} from '@/features/clinic/types/clinic.types'
import { phoneMask, cepMask } from '@/lib/masks'

interface ClinicFormClientProps {
  initialData: ClinicData
}

export function ClinicFormClient({ initialData }: ClinicFormClientProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingCEP, setIsLoadingCEP] = useState(false)
  
  const supabase = createClient()

  const form = useForm<UpdateClinicFormData>({
    resolver: zodResolver(updateClinicSchema),
    defaultValues: {
      name: initialData.name,
      phone: initialData.phone,
      specialties: initialData.specialties,
      cep: initialData.cep,
      address: initialData.address,
      number: initialData.number,
      complement: initialData.complement || '',
      city: initialData.city,
      state: initialData.state,
    },
  })

  const watchedCEP = form.watch('cep')

  // Auto-fetch address when CEP changes
  useEffect(() => {
    const fetchAddressByCEP = async (cep: string) => {
      const cleanCEP = cep.replace(/\D/g, '')
      if (cleanCEP.length !== 8) return

      setIsLoadingCEP(true)
      try {
        const response = await fetch(`/api/address/cep/${cleanCEP}`)
        if (response.ok) {
          const data = await response.json()
          
          form.setValue('address', data.address)
          form.setValue('city', data.city)
          form.setValue('state', data.state)
          
          // Clear any previous errors
          form.clearErrors(['address', 'city', 'state'])
        }
      } catch (error) {
        console.error('Error fetching address:', error)
      } finally {
        setIsLoadingCEP(false)
      }
    }

    if (watchedCEP && watchedCEP !== initialData.cep) {
      fetchAddressByCEP(watchedCEP)
    }
  }, [watchedCEP, form, initialData.cep])

  const handleSubmit = async (data: UpdateClinicFormData) => {
    setIsSubmitting(true)
    
    try {
      await ClinicService.update(data, supabase)
      
      toast.success('Dados da clínica atualizados com sucesso!')
      
      // Refresh the page to show updated data
      router.refresh()
    } catch (error) {
      console.error('Error updating clinic data:', error)
      toast.error('Erro ao atualizar dados da clínica')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="p-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Dados da Clínica
          </h1>
          <p className="text-muted-foreground">
            Configure as informações básicas da sua clínica
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
          
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Informações Básicas
              </CardTitle>
              <CardDescription>
                Nome e informações de contato da clínica
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Clínica</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Clínica São José"
                        {...field} 
                      />
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
                      <Input 
                        placeholder="(11) 99999-9999"
                        {...field}
                        onChange={(e) => field.onChange(phoneMask(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Endereço
              </CardTitle>
              <CardDescription>
                Localização da clínica
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="cep"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            placeholder="00000-000"
                            {...field}
                            onChange={(e) => field.onChange(cepMask(e.target.value))}
                          />
                          {isLoadingCEP && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Rua, Avenida..."
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="123"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="complement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complemento</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Sala, Bloco... (opcional)"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="São Paulo"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="SP"
                        maxLength={2}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Specialties */}
          <Card>
            <CardHeader>
              <CardTitle>Especialidades</CardTitle>
              <CardDescription>
                Selecione as especialidades oferecidas pela clínica
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="specialties"
                render={() => (
                  <FormItem>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {MEDICAL_SPECIALTIES.map((specialty) => (
                        <FormField
                          key={specialty}
                          control={form.control}
                          name="specialties"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={specialty}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(specialty)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, specialty])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== specialty
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  {specialty}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}