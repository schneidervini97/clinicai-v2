// Rota de compatibilidade para webhooks do Evolution API
// Redireciona para a nova rota /api/webhooks/evolution

import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Obtém o body da requisição
    const body = await request.json()
    
    // Cria uma nova requisição para a rota correta
    const webhookUrl = new URL('/api/webhooks/evolution', request.url)
    
    const webhookRequest = new Request(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })
    
    // Processa o webhook na rota correta
    const { POST: webhookHandler } = await import('../../webhooks/evolution/route')
    return await webhookHandler(webhookRequest as NextRequest)
    
  } catch (error) {
    console.error('Error redirecting webhook:', error)
    return Response.json(
      { error: 'Webhook redirect failed' },
      { status: 500 }
    )
  }
}

// Também suporta GET para verificação
export async function GET() {
  return Response.json({
    message: 'Webhook compatibility route - redirects to /api/webhooks/evolution',
    status: 'active'
  })
}