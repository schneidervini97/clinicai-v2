// Google UTM tracking webhook
// Receives UTM parameters and creates marketing leads for Google Ads tracking
// Expected format: POST with { phone, utm_source, utm_medium, utm_campaign, utm_content, utm_term, tracking_id }

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MarketingService } from '@/features/marketing/services/marketing.service'
import { ChatService } from '@/features/chat/services/chat.service'

interface GoogleUtmWebhookData {
  phone: string
  clinic_id?: string
  instance_name?: string
  
  // UTM parameters
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  
  // Google Ads tracking ID (format: GA-XXXXXXXXX)
  tracking_id?: string
  
  // Optional metadata
  landing_page?: string
  referrer?: string
  user_agent?: string
  ip_address?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: GoogleUtmWebhookData = await request.json()
    
    console.log('Google UTM webhook received:', {
      phone: body.phone,
      utm_campaign: body.utm_campaign,
      utm_source: body.utm_source,
      tracking_id: body.tracking_id,
      timestamp: new Date().toISOString()
    })

    // Validate required fields
    if (!body.phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Determine clinic_id
    let clinicId = body.clinic_id

    if (!clinicId && body.instance_name) {
      // Find clinic by WhatsApp instance name
      const { data: connection } = await supabase
        .from('whatsapp_connections')
        .select('clinic_id')
        .eq('instance_name', body.instance_name)
        .single()

      if (connection) {
        clinicId = connection.clinic_id
      }
    }

    if (!clinicId) {
      console.error('Cannot determine clinic_id for Google UTM webhook:', {
        provided_clinic_id: body.clinic_id,
        provided_instance_name: body.instance_name
      })
      return NextResponse.json(
        { error: 'Cannot determine clinic ID' },
        { status: 400 }
      )
    }

    // Check if lead already exists for this phone
    const existingLead = await MarketingService.findLeadByPhone(
      clinicId,
      body.phone,
      supabase
    )

    if (existingLead) {
      console.log('Lead already exists for phone:', {
        phone: body.phone,
        existingLeadId: existingLead.id,
        existingSource: existingLead.source
      })
      
      // Update existing lead with Google UTM data if it was organic
      if (existingLead.source === 'organic') {
        await supabase
          .from('marketing_leads')
          .update({
            source: 'google',
            google_utm_source: body.utm_source,
            google_utm_medium: body.utm_medium,
            google_utm_campaign: body.utm_campaign,
            google_utm_content: body.utm_content,
            google_utm_term: body.utm_term,
            google_tracking_id: body.tracking_id
          })
          .eq('id', existingLead.id)

        console.log('Updated organic lead to Google source:', {
          leadId: existingLead.id,
          phone: body.phone
        })
      }

      return NextResponse.json({ 
        success: true, 
        lead_id: existingLead.id,
        updated: existingLead.source === 'organic'
      })
    }

    // Find existing conversation for this phone
    let conversationId: string | undefined

    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('patient_phone', body.phone)
      .order('created_at', { ascending: false })
      .limit(1)

    if (conversations && conversations.length > 0) {
      conversationId = conversations[0].id
    }

    // Create Google UTM data object
    const googleData = {
      utm_source: body.utm_source || 'google',
      utm_medium: body.utm_medium || 'cpc',
      utm_campaign: body.utm_campaign,
      utm_content: body.utm_content,
      utm_term: body.utm_term,
      tracking_id: body.tracking_id,
      landing_page: body.landing_page,
      referrer: body.referrer,
      user_agent: body.user_agent,
      ip_address: body.ip_address
    }

    // Create marketing lead with Google source
    const leadId = await MarketingService.createLeadFromMessage(
      clinicId,
      body.phone,
      conversationId || '',
      'google',
      null, // metaData
      googleData,
      supabase
    )

    console.log('Google UTM lead created:', {
      leadId,
      phone: body.phone,
      clinicId,
      utm_campaign: body.utm_campaign,
      tracking_id: body.tracking_id
    })

    return NextResponse.json({ 
      success: true, 
      lead_id: leadId,
      created: true
    })

  } catch (error) {
    console.error('Google UTM webhook error:', {
      error: error.message,
      stack: error.stack
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Utility endpoint to create campaign from UTM data
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('Creating Google campaign from UTM data:', body)

    if (!body.clinic_id || !body.utm_campaign) {
      return NextResponse.json(
        { error: 'clinic_id and utm_campaign are required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Check if campaign already exists
    const { data: existingCampaign } = await supabase
      .from('marketing_campaigns')
      .select('id')
      .eq('clinic_id', body.clinic_id)
      .eq('platform', 'google')
      .eq('google_utm_campaign', body.utm_campaign)
      .single()

    if (existingCampaign) {
      return NextResponse.json({ 
        success: true, 
        campaign_id: existingCampaign.id,
        created: false
      })
    }

    // Create new Google Ads campaign
    const campaign = await MarketingService.createCampaign({
      clinic_id: body.clinic_id,
      name: body.utm_campaign,
      platform: 'google',
      google_utm_source: body.utm_source || 'google',
      google_utm_medium: body.utm_medium || 'cpc',
      google_utm_campaign: body.utm_campaign,
      google_utm_content: body.utm_content,
      google_utm_term: body.utm_term,
      status: 'active'
    }, supabase)

    console.log('Google campaign created:', {
      campaignId: campaign.id,
      name: campaign.name,
      clinicId: body.clinic_id
    })

    return NextResponse.json({ 
      success: true, 
      campaign_id: campaign.id,
      created: true
    })

  } catch (error) {
    console.error('Google campaign creation error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get endpoint for webhook URL verification
export async function GET() {
  return NextResponse.json({
    service: 'Google UTM Tracking Webhook',
    version: '1.0',
    endpoints: {
      POST: 'Create or update marketing lead from UTM data',
      PUT: 'Create Google Ads campaign from UTM parameters'
    },
    expected_format: {
      phone: 'string (required)',
      clinic_id: 'string (optional if instance_name provided)',
      instance_name: 'string (optional if clinic_id provided)',
      utm_source: 'string (optional, defaults to "google")',
      utm_medium: 'string (optional, defaults to "cpc")', 
      utm_campaign: 'string (optional)',
      utm_content: 'string (optional)',
      utm_term: 'string (optional)',
      tracking_id: 'string (optional, format: GA-XXXXXXXXX)',
      landing_page: 'string (optional)',
      referrer: 'string (optional)',
      user_agent: 'string (optional)',
      ip_address: 'string (optional)'
    }
  })
}