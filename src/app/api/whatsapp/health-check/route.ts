// API route for manual WhatsApp health check
// Allows forcing health verification for Evolution instances

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { EvolutionService } from '@/features/chat/services/evolution.service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get request data
    const body = await request.json()
    const { connectionId } = body

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      )
    }

    // Get clinic ID from clinics table directly
    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (clinicError || !clinic?.id) {
      return NextResponse.json(
        { error: 'Clinic not found' },
        { status: 404 }
      )
    }

    const clinicId = clinic.id

    // Get WhatsApp connection
    const { data: connection, error: connectionError } = await supabase
      .from('whatsapp_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('clinic_id', clinicId)
      .single()

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'WhatsApp connection not found' },
        { status: 404 }
      )
    }

    console.log('🩺 Manual health check requested for:', connection.instance_name)

    // Perform health check
    const existsCheck = await EvolutionService.checkInstanceExists(connection.instance_name)
    
    let healthStatus: string
    let healthError: string | null = null
    let connectionStatus = connection.status
    let requiresAction = false
    let actionRecommendation = ''

    if (!existsCheck.exists) {
      // Instance doesn't exist in Evolution
      healthStatus = 'not_found'
      healthError = existsCheck.error || 'Instance not found in Evolution API'
      connectionStatus = 'disconnected'
      requiresAction = true
      actionRecommendation = 'recriar'
      
      console.log('❌ Health check: Instance not found')
    } else {
      // Instance exists, check its connection state
      switch (existsCheck.status) {
        case 'open':
          healthStatus = 'healthy'
          connectionStatus = 'connected'
          console.log('✅ Health check: Instance healthy and connected')
          break
        
        case 'connecting':
          healthStatus = 'healthy'
          connectionStatus = 'qr_code'
          console.log('🔄 Health check: Instance connecting')
          break
          
        case 'close':
          healthStatus = 'unhealthy'
          healthError = 'Instance disconnected from WhatsApp'
          connectionStatus = 'disconnected'
          requiresAction = true
          actionRecommendation = 'reconectar'
          console.log('⚠️ Health check: Instance disconnected')
          break
          
        default:
          healthStatus = 'unknown'
          healthError = 'Unknown connection status'
          requiresAction = true
          actionRecommendation = 'verificar'
          console.log('❓ Health check: Unknown status')
      }
    }

    // Update database with health check results
    const { error: updateError } = await supabase
      .from('whatsapp_connections')
      .update({
        last_health_check_at: new Date().toISOString(),
        health_check_status: healthStatus,
        health_check_error: healthError,
        health_check_count: (connection.health_check_count || 0) + 1,
        status: connectionStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', connection.id)

    if (updateError) {
      console.error('❌ Error updating health check:', updateError)
      return NextResponse.json(
        { error: 'Failed to update health check status' },
        { status: 500 }
      )
    }

    // Return health check results
    const result = {
      connectionId: connection.id,
      instanceName: connection.instance_name,
      healthStatus,
      connectionStatus,
      healthError,
      requiresAction,
      actionRecommendation,
      lastHealthCheck: new Date().toISOString(),
      evolutionApiStatus: existsCheck.exists ? existsCheck.status : 'not_found',
      checkCount: (connection.health_check_count || 0) + 1
    }

    console.log('✅ Manual health check completed:', result)

    return NextResponse.json({
      success: true,
      data: result
    })
    
  } catch (error: any) {
    console.error('❌ Health check API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}

// GET method for getting current health status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get connectionId from query parameters
    const url = new URL(request.url)
    const connectionId = url.searchParams.get('connectionId')

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      )
    }

    // Get clinic ID from clinics table directly
    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (clinicError || !clinic?.id) {
      return NextResponse.json(
        { error: 'Clinic not found' },
        { status: 404 }
      )
    }

    const clinicId = clinic.id

    // Get WhatsApp connection with health data
    const { data: connection, error: connectionError } = await supabase
      .from('whatsapp_connections')
      .select(`
        id,
        instance_name,
        status,
        health_check_status,
        health_check_error,
        last_health_check_at,
        health_check_count,
        updated_at
      `)
      .eq('id', connectionId)
      .eq('clinic_id', clinicId)
      .single()

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'WhatsApp connection not found' },
        { status: 404 }
      )
    }

    // Calculate time since last health check
    let secondsSinceLastCheck = null
    if (connection.last_health_check_at) {
      const lastCheckTime = new Date(connection.last_health_check_at).getTime()
      const nowTime = new Date().getTime()
      secondsSinceLastCheck = Math.floor((nowTime - lastCheckTime) / 1000)
    }

    return NextResponse.json({
      success: true,
      data: {
        connectionId: connection.id,
        instanceName: connection.instance_name,
        status: connection.status,
        healthStatus: connection.health_check_status,
        healthError: connection.health_check_error,
        lastHealthCheck: connection.last_health_check_at,
        secondsSinceLastCheck,
        checkCount: connection.health_check_count || 0,
        lastUpdated: connection.updated_at
      }
    })
    
  } catch (error: any) {
    console.error('❌ Health status API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}