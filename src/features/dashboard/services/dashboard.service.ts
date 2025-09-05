// Dashboard Service - Main metrics and KPIs
// Provides comprehensive business intelligence data

import { SupabaseClient } from '@supabase/supabase-js'
import { 
  MainDashboardMetrics,
  DashboardAppointment,
  DashboardPatient,
  DashboardPayment,
  DashboardAlert,
  KPIMetric,
  RevenueChartData,
  AppointmentChartData,
  PieChartData,
  DashboardFilters
} from '../types/dashboard.types'
import { startOfMonth, endOfMonth, subMonths, format, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export class DashboardService {
  
  // ========================================================================
  // MAIN DASHBOARD METRICS
  // ========================================================================
  
  static async getMainDashboardMetrics(
    clinicId: string, 
    supabase: SupabaseClient
  ): Promise<MainDashboardMetrics> {
    try {
      // Get all metrics in parallel for better performance
      const [
        monthlyRevenue,
        patientsData,
        todayAppointments,
        occupancyRate,
        revenueChart,
        appointmentsChart,
        patientsSource,
        upcomingAppointments,
        birthdaysThisMonth,
        recentPatients,
        pendingPayments,
        alerts
      ] = await Promise.all([
        this.getMonthlyRevenue(clinicId, supabase),
        this.getPatientsOverview(clinicId, supabase),
        this.getTodayAppointments(clinicId, supabase),
        this.getOccupancyRate(clinicId, supabase),
        this.getRevenueChart(clinicId, supabase),
        this.getAppointmentsChart(clinicId, supabase),
        this.getPatientsSourceChart(clinicId, supabase),
        this.getUpcomingAppointments(clinicId, supabase),
        this.getBirthdaysThisMonth(clinicId, supabase),
        this.getRecentPatients(clinicId, supabase),
        this.getPendingPayments(clinicId, supabase),
        this.getAlerts(clinicId, supabase)
      ])
      
      return {
        kpis: {
          monthlyRevenue,
          totalPatients: patientsData,
          todayAppointments,
          occupancyRate
        },
        charts: {
          revenueChart,
          appointmentsChart,
          patientsSourceChart: patientsSource
        },
        widgets: {
          upcomingAppointments,
          birthdaysThisMonth,
          recentPatients,
          pendingPayments,
          alerts
        }
      }
      
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error)
      throw new Error('Failed to fetch dashboard metrics')
    }
  }

  // ========================================================================
  // KPI CALCULATIONS
  // ========================================================================

  private static async getMonthlyRevenue(
    clinicId: string, 
    supabase: SupabaseClient
  ): Promise<KPIMetric> {
    const currentMonth = startOfMonth(new Date())
    const lastMonth = startOfMonth(subMonths(new Date(), 1))
    
    const [current, previous] = await Promise.all([
      // Current month revenue
      supabase
        .from('financial_transactions')
        .select('amount')
        .eq('clinic_id', clinicId)
        .eq('type', 'income')
        .eq('status', 'paid')
        .gte('date', currentMonth.toISOString())
        .lt('date', endOfMonth(new Date()).toISOString()),
      
      // Previous month revenue  
      supabase
        .from('financial_transactions')
        .select('amount')
        .eq('clinic_id', clinicId)
        .eq('type', 'income')
        .eq('status', 'paid')
        .gte('date', lastMonth.toISOString())
        .lt('date', currentMonth.toISOString())
    ])
    
    const currentRevenue = current.data?.reduce((sum, t) => sum + t.amount, 0) || 0
    const previousRevenue = previous.data?.reduce((sum, t) => sum + t.amount, 0) || 0
    
    const change = previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
      : 0
    
    return {
      value: currentRevenue,
      change: Math.round(change * 100) / 100,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      formatted: new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL' 
      }).format(currentRevenue)
    }
  }

  private static async getPatientsOverview(
    clinicId: string, 
    supabase: SupabaseClient
  ): Promise<MainDashboardMetrics['kpis']['totalPatients']> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data, error } = await supabase
      .from('patient_stats')
      .select('*')
      .eq('clinic_id', clinicId)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching patient stats:', error)
    }
    
    return {
      value: data?.total_patients || 0,
      active: data?.active_patients || 0,
      inactive: data?.inactive_patients || 0,
      new30Days: data?.new_patients_30d || 0
    }
  }

  private static async getTodayAppointments(
    clinicId: string, 
    supabase: SupabaseClient
  ): Promise<MainDashboardMetrics['kpis']['todayAppointments']> {
    const today = startOfDay(new Date()).toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('appointments')
      .select('status')
      .eq('clinic_id', clinicId)
      .eq('date', today)
    
    if (error) {
      console.error('Error fetching today appointments:', error)
    }
    
    const appointments = data || []
    
    return {
      total: appointments.length,
      completed: appointments.filter(a => a.status === 'completed').length,
      pending: appointments.filter(a => a.status === 'scheduled').length,
      cancelled: appointments.filter(a => a.status === 'cancelled').length
    }
  }

  private static async getOccupancyRate(
    clinicId: string, 
    supabase: SupabaseClient
  ): Promise<KPIMetric> {
    const currentMonth = startOfMonth(new Date()).toISOString().split('T')[0]
    const lastMonth = startOfMonth(subMonths(new Date(), 1)).toISOString().split('T')[0]
    
    // Get active professionals count
    const { data: professionals } = await supabase
      .from('professionals')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('active', true)
    
    const professionalCount = professionals?.length || 0
    
    if (professionalCount === 0) {
      return { value: 0, change: 0, trend: 'stable' }
    }
    
    // Estimate available slots (8 hours * 2 slots/hour * 22 working days * professionals)
    const estimatedMonthlySlots = 8 * 2 * 22 * professionalCount
    
    const [currentBookings, previousBookings] = await Promise.all([
      supabase
        .from('appointments')
        .select('id')
        .eq('clinic_id', clinicId)
        .gte('date', currentMonth)
        .neq('status', 'cancelled'),
      
      supabase
        .from('appointments')
        .select('id')
        .eq('clinic_id', clinicId)
        .gte('date', lastMonth)
        .lt('date', currentMonth)
        .neq('status', 'cancelled')
    ])
    
    const currentRate = (currentBookings.data?.length || 0) / estimatedMonthlySlots * 100
    const previousRate = (previousBookings.data?.length || 0) / estimatedMonthlySlots * 100
    
    const change = previousRate > 0 ? currentRate - previousRate : 0
    
    return {
      value: Math.round(currentRate),
      change: Math.round(change * 100) / 100,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
    }
  }

  // ========================================================================
  // CHART DATA
  // ========================================================================

  private static async getRevenueChart(
    clinicId: string, 
    supabase: SupabaseClient
  ): Promise<RevenueChartData[]> {
    try {
      // Get last 6 months of appointment data
      const sixMonthsAgo = subMonths(new Date(), 6)
      
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          date,
          consultation_types (
            price
          )
        `)
        .eq('clinic_id', clinicId)
        .gte('date', sixMonthsAgo.toISOString().split('T')[0])
        .eq('status', 'completed')
      
      if (error) {
        console.warn('Error fetching appointments for revenue chart:', error)
        return this.getMockRevenueData()
      }
      
      // Group by month and calculate revenue
      const monthlyData = appointments?.reduce((acc: Record<string, { revenue: number; appointments: number }>, appointment) => {
        const monthKey = format(new Date(appointment.date), 'yyyy-MM')
        const consultationType = Array.isArray(appointment.consultation_types) ? appointment.consultation_types[0] : appointment.consultation_types
        const price = consultationType?.price || 0
        
        if (!acc[monthKey]) {
          acc[monthKey] = { revenue: 0, appointments: 0 }
        }
        
        acc[monthKey].revenue += price
        acc[monthKey].appointments += 1
        
        return acc
      }, {} as Record<string, { revenue: number; appointments: number }>)
      
      // Convert to chart format
      const chartData = Object.entries(monthlyData || {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([monthKey, data]) => ({
          month: monthKey,
          revenue: data.revenue,
          appointments: data.appointments,
          formatted: new Intl.NumberFormat('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
          }).format(data.revenue)
        }))
      
      return chartData.length > 0 ? chartData : this.getMockRevenueData()
      
    } catch (error) {
      console.warn('Error in getRevenueChart:', error)
      return this.getMockRevenueData()
    }
  }
  
  private static getMockRevenueData(): RevenueChartData[] {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i)
      const monthKey = format(date, 'yyyy-MM')
      const revenue = Math.floor(Math.random() * 5000) + 2000 // R$ 2000-7000
      const appointments = Math.floor(Math.random() * 30) + 15 // 15-45 consultas
      
      months.push({
        month: monthKey,
        revenue,
        appointments,
        formatted: new Intl.NumberFormat('pt-BR', { 
          style: 'currency', 
          currency: 'BRL' 
        }).format(revenue)
      })
    }
    return months
  }

  private static async getAppointmentsChart(
    clinicId: string, 
    supabase: SupabaseClient
  ): Promise<AppointmentChartData[]> {
    // Get last 7 days of appointments
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const { data, error } = await supabase
      .from('appointments')
      .select('date, status')
      .eq('clinic_id', clinicId)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('date')
    
    if (error) {
      console.error('Error fetching appointments chart:', error)
      return []
    }
    
    // Group by date and status
    const groupedData = (data || []).reduce((acc, appointment) => {
      const date = appointment.date
      if (!acc[date]) {
        acc[date] = { scheduled: 0, completed: 0, cancelled: 0, noShow: 0 }
      }
      
      switch (appointment.status) {
        case 'scheduled':
          acc[date].scheduled++
          break
        case 'completed':
          acc[date].completed++
          break
        case 'cancelled':
          acc[date].cancelled++
          break
        case 'no_show':
          acc[date].noShow++
          break
      }
      
      return acc
    }, {} as Record<string, { scheduled: number; completed: number; cancelled: number; noShow: number }>)
    
    return Object.entries(groupedData).map(([date, counts]) => ({
      date: format(new Date(date), 'dd/MM'),
      ...counts
    }))
  }

  private static async getPatientsSourceChart(
    clinicId: string, 
    supabase: SupabaseClient
  ): Promise<PieChartData[]> {
    const { data, error } = await supabase
      .from('patients')
      .select('media_origin')
      .eq('clinic_id', clinicId)
      .neq('status', 'archived')
    
    if (error) {
      console.error('Error fetching patients source chart:', error)
      return []
    }
    
    const sourceCounts = (data || []).reduce((acc, patient) => {
      const source = patient.media_origin || 'Não informado'
      acc[source] = (acc[source] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const total = Object.values(sourceCounts).reduce((sum, count) => sum + count, 0)
    
    const colors = [
      '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'
    ]
    
    return Object.entries(sourceCounts)
      .map(([name, value], index) => ({
        name,
        value,
        percentage: Math.round((value / total) * 100),
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.value - a.value)
  }

  // ========================================================================
  // WIDGET DATA
  // ========================================================================

  private static async getUpcomingAppointments(
    clinicId: string, 
    supabase: SupabaseClient
  ): Promise<DashboardAppointment[]> {
    const today = new Date()
    const nextWeek = new Date()
    nextWeek.setDate(today.getDate() + 7)
    
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        date,
        start_time,
        end_time,
        status,
        patient_id,
        professional_id,
        consultation_type_id,
        patients!inner (
          name,
          phone
        ),
        professionals!inner (
          name
        ),
        consultation_types (
          name
        )
      `)
      .eq('clinic_id', clinicId)
      .eq('status', 'scheduled')
      .gte('date', today.toISOString().split('T')[0])
      .lte('date', nextWeek.toISOString().split('T')[0])
      .order('date')
      .order('start_time')
      .limit(5)
    
    if (error) {
      console.error('Error fetching upcoming appointments:', error)
      return []
    }
    
    return (data || []).map(appointment => ({
      id: appointment.id,
      patient_name: (Array.isArray(appointment.patients) ? appointment.patients[0] : appointment.patients)?.name || 'Paciente não encontrado',
      patient_phone: (Array.isArray(appointment.patients) ? appointment.patients[0] : appointment.patients)?.phone || '',
      professional_name: (Array.isArray(appointment.professionals) ? appointment.professionals[0] : appointment.professionals)?.name || 'Profissional não encontrado',
      date: appointment.date,
      start_time: appointment.start_time.substring(0, 5),
      end_time: appointment.end_time.substring(0, 5),
      consultation_type: (Array.isArray(appointment.consultation_types) ? appointment.consultation_types[0] : appointment.consultation_types)?.name || 'Consulta',
      status: appointment.status,
      is_today: appointment.date === today.toISOString().split('T')[0]
    }))
  }

  private static async getBirthdaysThisMonth(
    clinicId: string, 
    supabase: SupabaseClient
  ): Promise<DashboardPatient[]> {
    const { data, error } = await supabase
      .from('patient_stats')
      .select('birthdays_this_month')
      .eq('clinic_id', clinicId)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching birthday stats:', error)
    }
    
    const birthdayCount = data?.birthdays_this_month || 0
    
    if (birthdayCount === 0) return []
    
    // Get actual birthday patients
    const currentMonth = new Date().getMonth() + 1
    
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('id, name, phone, birth_date, status')
      .eq('clinic_id', clinicId)
      .neq('status', 'archived')
      .not('birth_date', 'is', null)
      .limit(5)
    
    if (patientsError) {
      console.error('Error fetching birthday patients:', patientsError)
      return []
    }
    
    return (patients || [])
      .filter(patient => {
        if (!patient.birth_date) return false
        const birthMonth = new Date(patient.birth_date).getMonth() + 1
        return birthMonth === currentMonth
      })
      .map(patient => {
        const birthDay = new Date(patient.birth_date!).getDate()
        const today = new Date().getDate()
        const daysUntilBirthday = birthDay >= today ? birthDay - today : 0
        
        return {
          id: patient.id,
          name: patient.name,
          phone: patient.phone,
          birth_date: patient.birth_date,
          status: patient.status,
          total_visits: 0, // TODO: Calculate from appointments
          days_until_birthday: daysUntilBirthday,
          created_at: ''
        }
      })
      .sort((a, b) => (a.days_until_birthday || 0) - (b.days_until_birthday || 0))
  }

  private static async getRecentPatients(
    clinicId: string, 
    supabase: SupabaseClient
  ): Promise<DashboardPatient[]> {
    const { data, error } = await supabase
      .from('patients')
      .select('id, name, phone, status, created_at')
      .eq('clinic_id', clinicId)
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (error) {
      console.error('Error fetching recent patients:', error)
      return []
    }
    
    return (data || []).map(patient => ({
      id: patient.id,
      name: patient.name,
      phone: patient.phone,
      status: patient.status,
      total_visits: 0, // TODO: Calculate from appointments
      created_at: patient.created_at
    }))
  }

  private static async getPendingPayments(
    clinicId: string, 
    supabase: SupabaseClient
  ): Promise<DashboardPayment[]> {
    // TODO: financial_transactions table doesn't have due_date column yet
    // Return empty array until table structure is updated
    const { error } = await supabase
      .from('financial_transactions')
      .select(`
        id,
        amount,
        status,
        patient_id,
        patients!inner (
          name,
          phone
        )
      `)
      .eq('clinic_id', clinicId)
      .eq('status', 'pending')
      .limit(5)
    
    if (error) {
      console.warn('Error fetching pending payments:', error)
      return []
    }
    
    // Since due_date column doesn't exist yet, return empty array
    // TODO: Add due_date column to financial_transactions table
    return []
  }

  private static async getAlerts(
    clinicId: string, 
    supabase: SupabaseClient
  ): Promise<DashboardAlert[]> {
    // For now, return some sample alerts based on data
    // TODO: Implement proper alerts system
    const alerts: DashboardAlert[] = []
    
    // Check for overdue payments
    const { data: overduePayments } = await supabase
      .from('financial_transactions')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('status', 'pending')
      .lt('due_date', new Date().toISOString())
    
    if (overduePayments && overduePayments.length > 0) {
      alerts.push({
        id: 'overdue-payments',
        type: 'warning',
        title: 'Pagamentos em Atraso',
        message: `Você tem ${overduePayments.length} pagamento(s) em atraso`,
        action: 'Ver Pagamentos',
        action_url: '/dashboard/relatorios/financeiro',
        created_at: new Date().toISOString()
      })
    }
    
    // Check for today's appointments
    const { data: todayAppointments } = await supabase
      .from('appointments')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('date', new Date().toISOString().split('T')[0])
      .eq('status', 'scheduled')
    
    if (todayAppointments && todayAppointments.length > 0) {
      alerts.push({
        id: 'today-appointments',
        type: 'info',
        title: 'Consultas de Hoje',
        message: `Você tem ${todayAppointments.length} consulta(s) agendada(s) para hoje`,
        action: 'Ver Agenda',
        action_url: '/dashboard/agenda',
        created_at: new Date().toISOString()
      })
    }
    
    return alerts
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount)
  }

  static formatPercentage(value: number): string {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  static formatDate(date: string): string {
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR })
  }
}