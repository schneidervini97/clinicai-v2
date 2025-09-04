// Marketing system types for Meta Ads and Google Ads tracking

export interface MarketingCampaign {
  id: string
  clinic_id: string
  
  // Basic campaign info
  name: string
  platform: 'meta' | 'google' | 'whatsapp'
  campaign_id?: string
  
  // Meta Ads specific
  meta_campaign_id?: string
  meta_adset_id?: string
  meta_ad_id?: string
  meta_campaign_name?: string
  
  // Google Ads specific
  google_campaign_id?: string
  google_adgroup_id?: string
  google_keyword?: string
  google_utm_source?: string
  google_utm_medium?: string
  google_utm_campaign?: string
  google_utm_content?: string
  google_utm_term?: string
  
  // Status and dates
  status: 'active' | 'paused' | 'completed' | 'archived'
  start_date?: string
  end_date?: string
  
  created_at: string
  updated_at: string
}

export interface MarketingLead {
  id: string
  clinic_id: string
  campaign_id?: string
  
  // Lead identification
  phone: string
  name?: string
  
  // Relationships
  conversation_id?: string
  patient_id?: string
  
  // Source tracking
  source: 'meta' | 'google' | 'whatsapp' | 'organic'
  
  // Meta Ads data
  meta_campaign_id?: string
  meta_adset_id?: string
  meta_ad_id?: string
  meta_campaign_name?: string
  meta_message_id?: string
  
  // Google Ads data
  google_utm_source?: string
  google_utm_medium?: string
  google_utm_campaign?: string
  google_utm_content?: string
  google_utm_term?: string
  google_tracking_id?: string
  
  // Webhook data
  evolution_message_data?: any
  
  // Lead status
  status: 'new' | 'contacted' | 'qualified' | 'appointment' | 'converted' | 'lost'
  
  // Conversion funnel timestamps
  first_message_at?: string
  first_response_at?: string
  appointment_scheduled_at?: string
  converted_at?: string
  
  created_at: string
  updated_at: string

  // Relations (when using joins)
  campaign?: Pick<MarketingCampaign, 'id' | 'name' | 'platform'>
  conversation?: { id: string, patient_name?: string }
  patient?: { id: string, name: string, email?: string }
}

export interface MarketingConversion {
  id: string
  clinic_id: string
  lead_id: string
  campaign_id?: string
  
  conversion_type: 'first_message' | 'first_response' | 'appointment' | 'patient_created' | 'first_visit'
  
  conversion_value?: number
  currency?: string
  
  metadata?: any
  
  created_at: string
}

// Input types for creating/updating
export interface CampaignInput {
  clinic_id: string
  name: string
  platform: 'meta' | 'google' | 'whatsapp'
  campaign_id?: string
  
  // Meta Ads fields
  meta_campaign_id?: string
  meta_adset_id?: string
  meta_ad_id?: string
  meta_campaign_name?: string
  
  // Google Ads fields
  google_campaign_id?: string
  google_adgroup_id?: string
  google_keyword?: string
  google_utm_source?: string
  google_utm_medium?: string
  google_utm_campaign?: string
  google_utm_content?: string
  google_utm_term?: string
  
  status?: 'active' | 'paused' | 'completed' | 'archived'
  start_date?: string
  end_date?: string
}

export interface LeadInput {
  clinic_id: string
  phone: string
  name?: string
  conversation_id?: string
  source: 'meta' | 'google' | 'whatsapp' | 'organic'
  
  // Meta Ads data
  meta_campaign_id?: string
  meta_adset_id?: string
  meta_ad_id?: string
  meta_campaign_name?: string
  meta_message_id?: string
  
  // Google Ads data
  google_utm_source?: string
  google_utm_medium?: string
  google_utm_campaign?: string
  google_utm_content?: string
  google_utm_term?: string
  google_tracking_id?: string
  
  evolution_message_data?: any
  status?: MarketingLead['status']
}

// Analytics and reporting types
export interface CampaignStats {
  campaign_id: string
  campaign_name: string
  platform: string
  clinic_id: string
  campaign_status: string
  
  // Lead counters
  total_leads: number
  new_leads: number
  contacted_leads: number
  qualified_leads: number
  appointment_leads: number
  converted_leads: number
  lost_leads: number
  
  // Conversion rates
  conversion_rate: number
  
  // Time statistics
  avg_response_time_seconds?: number
  avg_conversion_time_seconds?: number
  
  // Financial
  total_conversion_value: number
  
  // Dates
  first_lead_at?: string
  last_lead_at?: string
  campaign_created_at: string
}

export interface FunnelSummary {
  clinic_id: string
  source: string
  total_leads: number
  responded_leads: number
  appointment_leads: number
  converted_leads: number
  
  // Conversion rates
  response_rate: number
  appointment_rate: number
  conversion_rate: number
  
  // Time averages
  avg_response_hours: number
  avg_conversion_days: number
}

export interface DailyStats {
  clinic_id: string
  report_date: string
  source: string
  total_leads: number
  converted_leads: number
  daily_conversion_rate: number
  hourly_distribution: Record<string, number>
}

// Utility types for filters and pagination
export interface MarketingFilters {
  platform?: 'meta' | 'google' | 'whatsapp'
  source?: 'meta' | 'google' | 'whatsapp' | 'organic'
  status?: string
  dateFrom?: string
  dateTo?: string
}

export interface PaginationParams {
  page: number
  per_page: number
}

// Chart data types for dashboard
export interface LeadsBySourceChart {
  source: string
  count: number
  conversion_rate: number
  color: string
}

export interface ConversionFunnelChart {
  stage: string
  count: number
  percentage: number
  color: string
}

export interface TimeSeriesChart {
  date: string
  leads: number
  conversions: number
  conversion_rate: number
}

// Status configurations with UI metadata
export const LEAD_STATUSES = {
  new: {
    label: 'Novo',
    color: 'blue',
    description: 'Lead recém chegado'
  },
  contacted: {
    label: 'Contatado',
    color: 'yellow',
    description: 'Primeiro contato realizado'
  },
  qualified: {
    label: 'Qualificado',
    color: 'orange',
    description: 'Lead qualificado'
  },
  appointment: {
    label: 'Agendamento',
    color: 'purple',
    description: 'Agendamento realizado'
  },
  converted: {
    label: 'Convertido',
    color: 'green',
    description: 'Convertido em paciente'
  },
  lost: {
    label: 'Perdido',
    color: 'red',
    description: 'Lead perdido'
  }
} as const

export const CAMPAIGN_PLATFORMS = {
  meta: {
    label: 'Meta Ads',
    color: 'blue',
    icon: 'facebook'
  },
  google: {
    label: 'Google Ads',
    color: 'green',
    icon: 'google'
  },
  whatsapp: {
    label: 'WhatsApp',
    color: 'green',
    icon: 'message-circle'
  }
} as const

export const CONVERSION_TYPES = {
  first_message: {
    label: 'Primeira Mensagem',
    description: 'Lead enviou primeira mensagem'
  },
  first_response: {
    label: 'Primeira Resposta',
    description: 'Clínica respondeu ao lead'
  },
  appointment: {
    label: 'Agendamento',
    description: 'Consulta agendada'
  },
  patient_created: {
    label: 'Paciente Cadastrado',
    description: 'Lead convertido em paciente'
  },
  first_visit: {
    label: 'Primeira Consulta',
    description: 'Primeira consulta realizada'
  }
} as const