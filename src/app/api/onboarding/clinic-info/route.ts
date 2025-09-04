import { NextRequest, NextResponse } from "next/server"
import { createClient } from '@/lib/supabase/server'
import { z } from "zod"

const clinicSchema = z.object({
  name: z.string().min(2, "Nome da clínica deve ter pelo menos 2 caracteres"),
  phone: z.string().min(14, "Telefone inválido"),
  specialties: z.array(z.string()).min(1, "Selecione pelo menos uma especialidade"),
  cep: z.string().min(9, "CEP inválido"),
  address: z.string().min(5, "Endereço deve ter pelo menos 5 caracteres"),
  number: z.string().min(1, "Número é obrigatório"),
  complement: z.string().optional(),
  city: z.string().min(2, "Cidade deve ter pelo menos 2 caracteres"),
  state: z.string().length(2, "Estado deve ter 2 caracteres"),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    const body = await req.json()
    const data = clinicSchema.parse(body)

    // Verificar se já existe uma clínica para este usuário
    const { data: existingClinic } = await supabase
      .from('clinics')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (existingClinic) {
      // Atualizar clínica existente
      const { data: updatedClinic, error: updateError } = await supabase
        .from('clinics')
        .update({
          name: data.name,
          phone: data.phone,
          specialties: data.specialties,
          cep: data.cep,
          address: data.address,
          number: data.number,
          complement: data.complement || "",
          city: data.city,
          state: data.state,
        })
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError) {
        console.error("Erro ao atualizar clínica:", updateError)
        return NextResponse.json(
          { error: "Erro ao atualizar clínica" },
          { status: 500 }
        )
      }

      // Atualizar status do onboarding
      await supabase
        .from('profiles')
        .update({ onboarding_status: "clinic_info" })
        .eq('id', user.id)

      return NextResponse.json(
        { message: "Informações da clínica atualizadas com sucesso", clinic: updatedClinic },
        { status: 200 }
      )
    } else {
      // Criar nova clínica
      const { data: newClinic, error: insertError } = await supabase
        .from('clinics')
        .insert({
          user_id: user.id,
          name: data.name,
          phone: data.phone,
          specialties: data.specialties,
          cep: data.cep,
          address: data.address,
          number: data.number,
          complement: data.complement || "",
          city: data.city,
          state: data.state,
        })
        .select()
        .single()

      if (insertError) {
        console.error("Erro ao criar clínica:", insertError)
        return NextResponse.json(
          { error: "Erro ao criar clínica" },
          { status: 500 }
        )
      }

      // Atualizar status do onboarding
      await supabase
        .from('profiles')
        .update({ onboarding_status: "clinic_info" })
        .eq('id', user.id)

      return NextResponse.json(
        { message: "Informações da clínica salvas com sucesso", clinic: newClinic },
        { status: 201 }
      )
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error("Erro ao salvar informações da clínica:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}