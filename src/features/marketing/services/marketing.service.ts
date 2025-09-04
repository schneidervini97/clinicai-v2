import { SupabaseClient } from '@supabase/supabase-js'
import { 
  MarketingCampaign,
  MarketingLead,
  MarketingConversion,
  CampaignStats,
  LeadInput,
  CampaignInput,
  FunnelSummary,
  DailyStats,
  PaginationParams,
  MarketingFilters
} from '../types/marketing.types'

export class MarketingService {
  // Campaign Management
  static async createCampaign(
    data: CampaignInput,
    supabase: SupabaseClient
  ): Promise<MarketingCampaign> {
    const { data: campaign, error } = await supabase
      .from('marketing_campaigns')
      .insert(data)
      .select('*')
      .single()

    if (error) {
      console.error('Error creating marketing campaign:', error)
      throw new Error('Erro ao criar campanha')
    }

    return campaign
  }

  static async updateCampaign(
    id: string,
    updates: Partial<CampaignInput>,
    supabase: SupabaseClient
  ): Promise<MarketingCampaign> {
    const { data: campaign, error } = await supabase
      .from('marketing_campaigns')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating marketing campaign:', error)
      throw new Error('Erro ao atualizar campanha')
    }

    return campaign
  }

  static async getCampaigns(
    clinicId: string,
    filters?: MarketingFilters,
    pagination?: PaginationParams,
    supabase: SupabaseClient
  ): Promise<{ data: MarketingCampaign[], count: number }> {
    let query = supabase
      .from('marketing_campaigns')
      .select('*', { count: 'exact' })
      .eq('clinic_id', clinicId)

    // Apply filters
    if (filters?.platform) {
      query = query.eq('platform', filters.platform)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom)
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo)
    }

    // Apply pagination
    if (pagination) {
      const offset = (pagination.page - 1) * pagination.per_page
      query = query.range(offset, offset + pagination.per_page - 1)
    }

    // Default ordering
    query = query.order('created_at', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching marketing campaigns:', error)
      throw new Error('Erro ao buscar campanhas')
    }

    return { data: data || [], count: count || 0 }
  }

  static async getCampaignStats(
    clinicId: string,
    campaignId?: string,
    supabase: SupabaseClient
  ): Promise<CampaignStats[]> {
    let query = supabase
      .from('marketing_campaign_stats')
      .select('*')
      .eq('clinic_id', clinicId)

    if (campaignId) {
      query = query.eq('campaign_id', campaignId)
    }

    const { data, error } = await query.order('campaign_created_at', { ascending: false })

    if (error) {
      console.error('Error fetching campaign stats:', error)
      throw new Error('Erro ao buscar estatísticas das campanhas')
    }

    return data || []
  }

  // Lead Management
  static async createLead(
    data: LeadInput,
    supabase: SupabaseClient
  ): Promise<MarketingLead> {
    const { data: lead, error } = await supabase
      .from('marketing_leads')
      .insert(data)
      .select('*')
      .single()

    if (error) {
      console.error('Error creating marketing lead:', error)
      throw new Error('Erro ao criar lead')
    }

    return lead
  }

  static async createLeadFromMessage(
    clinicId: string,
    phone: string,
    conversationId: string,
    source: 'meta' | 'google' | 'whatsapp' | 'organic',
    metaData?: any,
    googleData?: any,
    supabase: SupabaseClient
  ): Promise<string> {
    const { data: leadId, error } = await supabase
      .rpc('create_marketing_lead_from_message', {
        p_clinic_id: clinicId,
        p_phone: phone,
        p_conversation_id: conversationId,
        p_source: source,
        p_meta_data: metaData || null,
        p_google_data: googleData || null
      })

    if (error) {
      console.error('Error creating lead from message:', error)
      throw new Error('Erro ao criar lead da mensagem')
    }

    return leadId
  }

  static async updateLeadStatus(
    leadId: string,
    status: MarketingLead['status'],
    supabase: SupabaseClient
  ): Promise<void> {
    const updates: Partial<MarketingLead> = { status }

    // Set timestamps based on status
    const now = new Date().toISOString()
    switch (status) {
      case 'contacted':
        updates.first_response_at = now
        break
      case 'appointment':
        updates.appointment_scheduled_at = now
        break
      case 'converted':
        updates.converted_at = now
        break
    }

    const { error } = await supabase
      .from('marketing_leads')
      .update(updates)
      .eq('id', leadId)

    if (error) {
      console.error('Error updating lead status:', error)
      throw new Error('Erro ao atualizar status do lead')
    }

    // Create conversion event
    if (status === 'contacted') {
      await this.createConversion(leadId, 'first_response', supabase)
    } else if (status === 'appointment') {
      await this.createConversion(leadId, 'appointment', supabase)
    } else if (status === 'converted') {
      await this.createConversion(leadId, 'patient_created', supabase)
    }
  }

  static async getLeads(
    clinicId: string,
    filters?: MarketingFilters,
    pagination?: PaginationParams,
    supabase: SupabaseClient
  ): Promise<{ data: MarketingLead[], count: number }> {
    let query = supabase
      .from('marketing_leads')
      .select(`
        *,
        campaign:marketing_campaigns(id, name, platform),
        conversation:conversations(id, patient_name),
        patient:patients(id, name, email)
      `, { count: 'exact' })
      .eq('clinic_id', clinicId)

    // Apply filters
    if (filters?.source) {
      query = query.eq('source', filters.source)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom)
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo)
    }

    // Apply pagination
    if (pagination) {
      const offset = (pagination.page - 1) * pagination.per_page
      query = query.range(offset, offset + pagination.per_page - 1)
    }

    // Default ordering
    query = query.order('created_at', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching marketing leads:', error)
      throw new Error('Erro ao buscar leads')
    }

    return { data: data || [], count: count || 0 }
  }

  static async findLeadByPhone(
    clinicId: string,
    phone: string,
    supabase: SupabaseClient
  ): Promise<MarketingLead | null> {
    const { data, error } = await supabase
      .from('marketing_leads')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error finding lead by phone:', error)
      return null
    }

    return data
  }

  static async linkLeadToPatient(
    leadId: string,
    patientId: string,
    supabase: SupabaseClient
  ): Promise<void> {
    const { error } = await supabase
      .from('marketing_leads')
      .update({ 
        patient_id: patientId,
        status: 'converted',
        converted_at: new Date().toISOString()
      })
      .eq('id', leadId)

    if (error) {
      console.error('Error linking lead to patient:', error)
      throw new Error('Erro ao vincular lead ao paciente')
    }

    // Create conversion event
    await this.createConversion(leadId, 'patient_created', supabase)
  }

  // Conversion Tracking
  static async createConversion(
    leadId: string,
    type: MarketingConversion['conversion_type'],
    supabase: SupabaseClient,
    value?: number
  ): Promise<MarketingConversion> {
    // Get lead info for clinic_id and campaign_id
    const { data: lead } = await supabase
      .from('marketing_leads')
      .select('clinic_id, campaign_id')
      .eq('id', leadId)
      .single()

    if (!lead) {
      throw new Error('Lead não encontrado')
    }

    const { data: conversion, error } = await supabase
      .from('marketing_conversions')
      .insert({
        clinic_id: lead.clinic_id,
        lead_id: leadId,
        campaign_id: lead.campaign_id,
        conversion_type: type,
        conversion_value: value
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error creating conversion:', error)
      throw new Error('Erro ao criar conversão')
    }

    return conversion
  }

  // Analytics and Reports
  static async getFunnelSummary(
    clinicId: string,
    filters?: MarketingFilters,
    supabase: SupabaseClient
  ): Promise<FunnelSummary[]> {
    let query = supabase
      .from('marketing_funnel_summary')
      .select('*')
      .eq('clinic_id', clinicId)

    if (filters?.source) {
      query = query.eq('source', filters.source)
    }

    const { data, error } = await query.order('total_leads', { ascending: false })

    if (error) {
      console.error('Error fetching funnel summary:', error)
      throw new Error('Erro ao buscar resumo do funil')
    }

    return data || []
  }

  static async getDailyStats(
    clinicId: string,
    days: number = 30,
    supabase: SupabaseClient
  ): Promise<DailyStats[]> {
    const { data, error } = await supabase
      .from('marketing_daily_stats')
      .select('*')
      .eq('clinic_id', clinicId)
      .gte('report_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('report_date', { ascending: false })

    if (error) {
      console.error('Error fetching daily stats:', error)
      throw new Error('Erro ao buscar estatísticas diárias')
    }

    return data || []
  }

  static async getLeadsBySource(
    clinicId: string,
    dateFrom?: string,
    dateTo?: string,
    supabase: SupabaseClient
  ): Promise<{ source: string, count: number, conversion_rate: number }[]> {
    let query = supabase
      .from('marketing_leads')
      .select('source, status')
      .eq('clinic_id', clinicId)

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching leads by source:', error)
      throw new Error('Erro ao buscar leads por fonte')
    }

    // Group by source and calculate conversion rates
    const grouped = (data || []).reduce((acc, lead) => {
      if (!acc[lead.source]) {
        acc[lead.source] = { total: 0, converted: 0 }
      }
      acc[lead.source].total++
      if (lead.status === 'converted') {
        acc[lead.source].converted++
      }
      return acc
    }, {} as Record<string, { total: number, converted: number }>)

    return Object.entries(grouped).map(([source, stats]) => ({
      source,
      count: stats.total,
      conversion_rate: Math.round((stats.converted / stats.total) * 100 * 10) / 10
    }))
  }

  // Helper methods for detecting marketing sources
  static detectMetaAdSource(messageData: any): any | null {
    // Check if message has Meta Ads context from Evolution webhook
    if (messageData?.referral?.source_type === 'ad') {
      return {
        campaign_id: messageData.referral.source_id,
        campaign_name: messageData.referral.source_name,
        ad_id: messageData.referral.source_url,
      }
    }

    // Check Evolution API context fields
    if (messageData?.context?.ad_id) {
      return {
        campaign_id: messageData.context.campaign_id,
        adset_id: messageData.context.adset_id,
        ad_id: messageData.context.ad_id,
        campaign_name: messageData.context.campaign_name
      }
    }

    return null
  }

  static detectGoogleUtmSource(messageContent: string): any | null {
    // Look for GA tracking protocol in message content
    const gaRegex = /GA-[A-Z0-9]{8}/g
    const gaMatch = messageContent.match(gaRegex)

    if (gaMatch) {
      return {
        tracking_id: gaMatch[0],
        utm_source: 'google',
        utm_medium: 'cpc' // Default for Google Ads
      }
    }

    // Look for UTM parameters in message content
    const utmRegex = /utm_([a-z]+)=([^&\s]+)/g
    const utmMatches = [...messageContent.matchAll(utmRegex)]
    
    if (utmMatches.length > 0) {
      const utmData: any = {}
      utmMatches.forEach(match => {
        utmData[`utm_${match[1]}`] = decodeURIComponent(match[2])
      })
      return utmData
    }

    return null
  }

  // Automatic lead creation from Evolution webhook
  static async processEvolutionMessage(
    clinicId: string,
    phone: string,
    conversationId: string,
    messageData: any,
    messageContent: string,
    supabase: SupabaseClient
  ): Promise<void> {
    try {
      // Check if lead already exists for this phone
      const existingLead = await this.findLeadByPhone(clinicId, phone, supabase)
      if (existingLead) {
        return // Lead already exists, no need to create another
      }

      // Detect Meta Ads source
      const metaData = this.detectMetaAdSource(messageData)
      if (metaData) {
        await this.createLeadFromMessage(
          clinicId,
          phone,
          conversationId,
          'meta',
          metaData,
          null,
          supabase
        )
        console.log('📊 Meta Ads lead created:', { phone, metaData })
        return
      }

      // Detect Google Ads source
      const googleData = this.detectGoogleUtmSource(messageContent)
      if (googleData) {
        await this.createLeadFromMessage(
          clinicId,
          phone,
          conversationId,
          'google',
          null,
          googleData,
          supabase
        )
        console.log('📊 Google Ads lead created:', { phone, googleData })
        return
      }

      // If no marketing source detected, create organic lead
      await this.createLeadFromMessage(
        clinicId,
        phone,
        conversationId,
        'organic',
        null,
        null,
        supabase
      )
      console.log('📊 Organic lead created:', { phone })

    } catch (error) {
      console.error('Error processing Evolution message for marketing:', error)
      // Don't throw error to avoid breaking the main webhook flow
    }
  }
}