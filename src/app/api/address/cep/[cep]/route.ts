import { NextRequest, NextResponse } from "next/server"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ cep: string }> }
) {
  try {
    const { cep } = await params

    // Validar formato do CEP (apenas números ou com hífen)
    const cepRegex = /^\d{5}-?\d{3}$/
    if (!cepRegex.test(cep)) {
      return NextResponse.json(
        { error: "CEP inválido" },
        { status: 400 }
      )
    }

    // Remover caracteres especiais do CEP
    const cleanCep = cep.replace(/\D/g, "")

    // Buscar na API do ViaCEP
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)

    if (!response.ok) {
      return NextResponse.json(
        { error: "Erro ao buscar CEP" },
        { status: 500 }
      )
    }

    const data = await response.json()

    // Verificar se o CEP foi encontrado
    if (data.erro) {
      return NextResponse.json(
        { error: "CEP não encontrado" },
        { status: 404 }
      )
    }

    // Retornar dados do endereço
    return NextResponse.json({
      cep: data.cep,
      address: data.logradouro,
      neighborhood: data.bairro,
      city: data.localidade,
      state: data.uf,
      ibge: data.ibge,
      gia: data.gia,
      ddd: data.ddd,
      siafi: data.siafi,
    })
  } catch (error) {
    console.error("Erro ao buscar CEP:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}