'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Target, 
  MessageSquare, 
  Users, 
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertCircle,
  Facebook,
  Search,
  Phone
} from 'lucide-react'
import { MarketingService } from '../services/marketing.service'
import { 
  FunnelSummary, 
  DailyStats,
  LEAD_STATUSES,
  CAMPAIGN_PLATFORMS
} from '../types/marketing.types'

interface MarketingDashboardProps {
  clinicId: string
}

export function MarketingDashboard({ clinicId }: MarketingDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Analytics data
  const [funnelData, setFunnelData] = useState<FunnelSummary[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [leadsBySource, setLeadsBySource] = useState<{ source: string, count: number, conversion_rate: number }[]>([])

  const supabase = useMemo(() => createClient(), [])

  // Load dashboard data
  const loadData = async () => {
    try {
      setError(null)

      const [funnel, daily, sources] = await Promise.all([
        MarketingService.getFunnelSummary(clinicId, {}, supabase),
        MarketingService.getDailyStats(clinicId, 30, supabase),
        MarketingService.getLeadsBySource(clinicId, undefined, undefined, supabase)
      ])

      setFunnelData(funnel)
      setDailyStats(daily)
      setLeadsBySource(sources)

    } catch (err) {
      console.error('Error loading marketing dashboard:', err)
      setError('Erro ao carregar dados do dashboard')
    }
  }

  // Initial load
  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [clinicId])

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  // Calculate totals
  const totals = useMemo(() => {
    return funnelData.reduce((acc, source) => ({
      total_leads: acc.total_leads + source.total_leads,
      responded_leads: acc.responded_leads + source.responded_leads,
      appointment_leads: acc.appointment_leads + source.appointment_leads,
      converted_leads: acc.converted_leads + source.converted_leads
    }), {
      total_leads: 0,
      responded_leads: 0,
      appointment_leads: 0,
      converted_leads: 0
    })
  }, [funnelData])

  // Calculate conversion rates
  const overallConversionRate = totals.total_leads > 0 
    ? Math.round((totals.converted_leads / totals.total_leads) * 100 * 10) / 10
    : 0

  const responseRate = totals.total_leads > 0 
    ? Math.round((totals.responded_leads / totals.total_leads) * 100 * 10) / 10
    : 0

  // Get platform icon
  const getPlatformIcon = (source: string) => {
    switch (source) {
      case 'meta':
        return <Facebook className="h-4 w-4" />
      case 'google':
        return <Search className="h-4 w-4" />
      case 'whatsapp':
        return <MessageSquare className="h-4 w-4" />
      default:
        return <Phone className="h-4 w-4" />
    }
  }

  // Get platform color
  const getPlatformColor = (source: string) => {
    switch (source) {
      case 'meta':
        return 'bg-blue-500'
      case 'google':
        return 'bg-green-500'
      case 'whatsapp':
        return 'bg-green-600'
      default:
        return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Relatórios de Marketing</h2>
            <p className="text-gray-600 mt-1">
              Análise de leads do Meta Ads e Google Ads
            </p>
          </div>
        </div>

        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-5 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="h-12 bg-gray-200 rounded animate-pulse" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Relatórios de Marketing</h2>
          <p className="text-gray-600 mt-1">
            Análise de leads do Meta Ads e Google Ads
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Atualizando...' : 'Atualizar'}
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.total_leads}</div>
            <p className="text-xs text-muted-foreground">
              Últimos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Resposta</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{responseRate}%</div>
            <p className="text-xs text-muted-foreground">
              {totals.responded_leads} de {totals.total_leads} leads
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.appointment_leads}</div>
            <p className="text-xs text-muted-foreground">
              Consultas agendadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallConversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {totals.converted_leads} pacientes convertidos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel by Source */}
        <Card>
          <CardHeader>
            <CardTitle>Funil por Fonte</CardTitle>
            <CardDescription>
              Performance de conversão por canal de marketing
            </CardDescription>
          </CardHeader>
          <CardContent>
            {funnelData.length === 0 ? (
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  Nenhum dado de marketing ainda
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {funnelData.map((source) => (
                  <div key={source.source} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getPlatformIcon(source.source)}
                        <span className="font-medium capitalize">
                          {CAMPAIGN_PLATFORMS[source.source as keyof typeof CAMPAIGN_PLATFORMS]?.label || source.source}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {source.conversion_rate}% conversão
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {source.total_leads} leads
                      </span>
                    </div>
                    
                    {/* Funnel bars */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-24">Leads:</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${getPlatformColor(source.source)}`}
                            style={{ width: '100%' }}
                          />
                        </div>
                        <div className="w-8 text-right">{source.total_leads}</div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-24">Respondeu:</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${getPlatformColor(source.source)} opacity-75`}
                            style={{ 
                              width: source.total_leads > 0 
                                ? `${(source.responded_leads / source.total_leads) * 100}%` 
                                : '0%' 
                            }}
                          />
                        </div>
                        <div className="w-8 text-right">{source.responded_leads}</div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-24">Agendou:</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${getPlatformColor(source.source)} opacity-50`}
                            style={{ 
                              width: source.total_leads > 0 
                                ? `${(source.appointment_leads / source.total_leads) * 100}%` 
                                : '0%' 
                            }}
                          />
                        </div>
                        <div className="w-8 text-right">{source.appointment_leads}</div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-24">Converteu:</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${getPlatformColor(source.source)} opacity-25`}
                            style={{ 
                              width: source.total_leads > 0 
                                ? `${(source.converted_leads / source.total_leads) * 100}%` 
                                : '0%' 
                            }}
                          />
                        </div>
                        <div className="w-8 text-right">{source.converted_leads}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leads by Source */}
        <Card>
          <CardHeader>
            <CardTitle>Leads por Canal</CardTitle>
            <CardDescription>
              Distribuição de leads por fonte de marketing
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leadsBySource.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  Nenhum lead registrado ainda
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {leadsBySource.map((item) => (
                  <div key={item.source} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getPlatformColor(item.source)}`} />
                      <div>
                        <div className="font-medium capitalize">
                          {CAMPAIGN_PLATFORMS[item.source as keyof typeof CAMPAIGN_PLATFORMS]?.label || item.source}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {item.conversion_rate}% de conversão
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{item.count}</div>
                      <div className="text-xs text-muted-foreground">leads</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração do Rastreamento</CardTitle>
          <CardDescription>
            Como configurar o rastreamento de leads do Meta Ads e Google Ads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Facebook className="h-5 w-5 text-blue-600" />
                Meta Ads (Facebook/Instagram)
              </h4>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• O rastreamento é automático via webhook Evolution</p>
                <p>• Dados são capturados quando o usuário inicia conversa</p>
                <p>• Inclui: ID da campanha, conjunto de anúncios e anúncio</p>
                <p>• Configure "Click to WhatsApp" nos seus anúncios</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Search className="h-5 w-5 text-green-600" />
                Google Ads
              </h4>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• Use parâmetros UTM nas suas landing pages</p>
                <p>• Configure protocolo GA-XXXXXXXXX nas mensagens</p>
                <p>• Webhook: <code className="bg-gray-100 px-1 rounded">/api/webhooks/google-utm</code></p>
                <p>• Envie dados via POST com phone e UTM parameters</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}