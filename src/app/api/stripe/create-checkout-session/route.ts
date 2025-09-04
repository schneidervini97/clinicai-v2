import { NextRequest, NextResponse } from "next/server"
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
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

    const { priceId } = await req.json()

    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID é obrigatório" },
        { status: 400 }
      )
    }

    // Buscar ou criar customer no Stripe
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: "Perfil não encontrado" },
        { status: 404 }
      )
    }

    // Verificar se já existe um customer no Stripe para este usuário
    let customerId: string

    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (existingSubscription?.stripe_customer_id) {
      customerId = existingSubscription.stripe_customer_id
    } else {
      // Criar novo customer no Stripe
      const customer = await stripe.customers.create({
        email: user.email!,
        name: profile.name || undefined,
        metadata: {
          userId: user.id,
        },
      })
      customerId = customer.id
    }

    // Obter URL base da aplicação
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Criar sessão de checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${baseUrl}/dashboard?success=true`,
      cancel_url: `${baseUrl}/onboarding/subscription?canceled=true`,
      metadata: {
        userId: user.id,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Erro ao criar sessão de checkout:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}