"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { Loader2, Building2, Phone, MapPin, CheckCircle } from "lucide-react"
import { phoneMask, cepMask } from "@/lib/masks"

const clinicSchema = z.object({
  name: z.string().min(2, "Nome da clínica deve ter pelo menos 2 caracteres"),
  phone: z.string().min(14, "Telefone deve ter formato (11) 9999-9999 ou (11) 99999-9999"),
  specialties: z.array(z.string()).min(1, "Selecione pelo menos uma especialidade"),
  cep: z.string().min(9, "CEP deve ter formato 00000-000"),
  address: z.string().min(5, "Endereço deve ter pelo menos 5 caracteres"),
  number: z.string().min(1, "Número é obrigatório"),
  complement: z.string().optional(),
  city: z.string().min(2, "Cidade deve ter pelo menos 2 caracteres"),
  state: z.string().length(2, "Estado deve ter 2 caracteres"),
})

type ClinicForm = z.infer<typeof clinicSchema>

const specialtyOptions = [
  "Cardiologia",
  "Dermatologia",
  "Endocrinologia",
  "Gastroenterologia",
  "Ginecologia",
  "Neurologia",
  "Oftalmologia",
  "Ortopedia",
  "Otorrinolaringologia",
  "Pediatria",
  "Pneumologia",
  "Psiquiatria",
  "Urologia",
  "Clínica Geral",
  "Medicina de Família",
]

export default function ClinicInfoPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingCep, setLoadingCep] = useState(false)
  const router = useRouter()

  const form = useForm<ClinicForm>({
    resolver: zodResolver(clinicSchema),
    defaultValues: {
      name: "",
      phone: "",
      specialties: [],
      cep: "",
      address: "",
      number: "",
      complement: "",
      city: "",
      state: "",
    },
  })

  const searchCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "")
    if (cleanCep.length !== 8) return

    setLoadingCep(true)
    try {
      const response = await fetch(`/api/address/cep/${cleanCep}`)
      if (response.ok) {
        const data = await response.json()
        form.setValue("address", data.address || "")
        form.setValue("city", data.city || "")
        form.setValue("state", data.state || "")
        toast.success("CEP encontrado!")
      } else {
        toast.error("CEP não encontrado")
      }
    } catch (error) {
      toast.error("Erro ao buscar CEP")
    } finally {
      setLoadingCep(false)
    }
  }

  const onSubmit = async (data: ClinicForm) => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/onboarding/clinic-info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        toast.success("Informações da clínica salvas com sucesso!")
        router.push("/onboarding/subscription")
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Erro ao salvar informações")
      }
    } catch (error) {
      toast.error("Erro ao salvar informações")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Building2 className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold">Informações da Clínica</h1>
        </div>
        <p className="text-gray-600">
          Vamos começar configurando os dados da sua clínica. Essas informações
          aparecerão em seus relatórios e comunicações.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da Clínica</CardTitle>
          <CardDescription>
            Preencha as informações básicas da sua clínica
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Clínica *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Clínica São João"
                        {...field}
                        disabled={isLoading}
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
                    <FormLabel>Telefone *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="(11) 99999-9999"
                          {...field}
                          onChange={(e) => {
                            const masked = phoneMask(e.target.value)
                            field.onChange(masked)
                          }}
                          className="pl-10"
                          disabled={isLoading}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="specialties"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Especialidades *</FormLabel>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {specialtyOptions.map((specialty) => (
                        <div key={specialty} className="flex items-center space-x-2">
                          <Checkbox
                            checked={field.value.includes(specialty)}
                            onCheckedChange={(checked) => {
                              const newValue = checked
                                ? [...field.value, specialty]
                                : field.value.filter((val) => val !== specialty)
                              field.onChange(newValue)
                            }}
                            disabled={isLoading}
                          />
                          <label className="text-sm">{specialty}</label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="border-t pt-6">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Endereço
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="cep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder="00000-000"
                              {...field}
                              onChange={(e) => {
                                const masked = cepMask(e.target.value)
                                field.onChange(masked)
                                if (masked.replace(/\D/g, "").length === 8) {
                                  searchCep(masked)
                                }
                              }}
                              disabled={isLoading}
                            />
                            {loadingCep && (
                              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="123"
                            {...field}
                            disabled={isLoading}
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
                            placeholder="Sala 101"
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Rua das Flores"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="São Paulo"
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="SP"
                            {...field}
                            maxLength={2}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Continuar para Planos
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}