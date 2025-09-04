// Evolution API Proxy - Secure proxy for Evolution API calls
// Keeps API credentials server-side and adds authentication

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY

if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
  console.error('Missing Evolution API credentials in environment variables')
}

async function authenticateUser(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }

    // Verify user has an active clinic
    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (clinicError || !clinic) {
      return null
    }

    return { user, clinic }
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}

async function proxyToEvolution(
  method: string,
  path: string,
  body?: unknown,
  additionalHeaders: Record<string, string> = {}
): Promise<{ response: Response; errorText?: string }> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    throw new Error('Evolution API credentials not configured')
  }

  const url = `${EVOLUTION_API_URL}${path}`
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': EVOLUTION_API_KEY,
    ...additionalHeaders
  }

  const options: RequestInit = {
    method,
    headers
  }

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body)
  }

  console.log(`Evolution API ${method} ${url}`)

  const response = await fetch(url, options)
  
  // If there's an error, read the body once and return both response and error text
  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Evolution API error: ${response.status} ${response.statusText}`, errorText)
    return { response, errorText }
  }

  return { response }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Authenticate user
    const auth = await authenticateUser(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get path from params
    const { path } = await params
    const evolutionPath = `/${path.join('/')}`
    
    // Add query params if present
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()
    const fullPath = queryString ? `${evolutionPath}?${queryString}` : evolutionPath

    // Proxy to Evolution API
    const { response, errorText } = await proxyToEvolution('GET', fullPath)
    
    if (!response.ok && errorText) {
      // Return the actual Evolution API error
      try {
        const errorData = JSON.parse(errorText)
        return NextResponse.json(errorData, { status: response.status })
      } catch {
        return NextResponse.json(
          { error: 'Evolution API error', message: errorText },
          { status: response.status }
        )
      }
    }

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })

  } catch (error) {
    console.error('Evolution API proxy error:', error)
    
    // Only return 500 for actual server errors, not API responses
    if (error instanceof Error && error.message.includes('Evolution API credentials not configured')) {
      return NextResponse.json(
        { error: 'Evolution API not configured' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Authenticate user
    const auth = await authenticateUser(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get path from params
    const { path } = await params
    const evolutionPath = `/${path.join('/')}`

    // Get request body
    let body
    try {
      body = await request.json()
    } catch (error) {
      body = null
    }

    // Proxy to Evolution API
    const { response, errorText } = await proxyToEvolution('POST', evolutionPath, body)
    
    if (!response.ok && errorText) {
      // Return the actual Evolution API error
      try {
        const errorData = JSON.parse(errorText)
        return NextResponse.json(errorData, { status: response.status })
      } catch {
        return NextResponse.json(
          { error: 'Evolution API error', message: errorText },
          { status: response.status }
        )
      }
    }

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })

  } catch (error) {
    console.error('Evolution API proxy error:', error)
    
    // Only return 500 for actual server errors, not API responses
    if (error instanceof Error && error.message.includes('Evolution API credentials not configured')) {
      return NextResponse.json(
        { error: 'Evolution API not configured' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Authenticate user
    const auth = await authenticateUser(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get path from params
    const { path } = await params
    const evolutionPath = `/${path.join('/')}`

    // Get request body
    let body
    try {
      body = await request.json()
    } catch (error) {
      body = null
    }

    // Proxy to Evolution API
    const { response, errorText } = await proxyToEvolution('PUT', evolutionPath, body)
    
    if (!response.ok && errorText) {
      // Return the actual Evolution API error
      try {
        const errorData = JSON.parse(errorText)
        return NextResponse.json(errorData, { status: response.status })
      } catch {
        return NextResponse.json(
          { error: 'Evolution API error', message: errorText },
          { status: response.status }
        )
      }
    }

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })

  } catch (error) {
    console.error('Evolution API proxy error:', error)
    
    // Only return 500 for actual server errors, not API responses
    if (error instanceof Error && error.message.includes('Evolution API credentials not configured')) {
      return NextResponse.json(
        { error: 'Evolution API not configured' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Authenticate user
    const auth = await authenticateUser(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get path from params
    const { path } = await params
    const evolutionPath = `/${path.join('/')}`

    // Proxy to Evolution API
    const { response, errorText } = await proxyToEvolution('DELETE', evolutionPath)
    
    if (!response.ok && errorText) {
      // Return the actual Evolution API error
      try {
        const errorData = JSON.parse(errorText)
        return NextResponse.json(errorData, { status: response.status })
      } catch {
        return NextResponse.json(
          { error: 'Evolution API error', message: errorText },
          { status: response.status }
        )
      }
    }

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })

  } catch (error) {
    console.error('Evolution API proxy error:', error)
    
    // Only return 500 for actual server errors, not API responses
    if (error instanceof Error && error.message.includes('Evolution API credentials not configured')) {
      return NextResponse.json(
        { error: 'Evolution API not configured' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Authenticate user
    const auth = await authenticateUser(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get path from params
    const { path } = await params
    const evolutionPath = `/${path.join('/')}`

    // Get request body
    let body
    try {
      body = await request.json()
    } catch (error) {
      body = null
    }

    // Proxy to Evolution API
    const { response, errorText } = await proxyToEvolution('PATCH', evolutionPath, body)
    
    if (!response.ok && errorText) {
      // Return the actual Evolution API error
      try {
        const errorData = JSON.parse(errorText)
        return NextResponse.json(errorData, { status: response.status })
      } catch {
        return NextResponse.json(
          { error: 'Evolution API error', message: errorText },
          { status: response.status }
        )
      }
    }

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })

  } catch (error) {
    console.error('Evolution API proxy error:', error)
    
    // Only return 500 for actual server errors, not API responses
    if (error instanceof Error && error.message.includes('Evolution API credentials not configured')) {
      return NextResponse.json(
        { error: 'Evolution API not configured' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}