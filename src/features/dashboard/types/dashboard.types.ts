// Dashboard types for metrics and KPIs
// Defines all TypeScript interfaces for dashboard data

export interface KPIMetric {
  value: number
  change: number // % change vs previous period
  trend: 'up' | 'down' | 'stable'
  formatted?: string // For display (e.g., "R$ 1.500")
}

export interface BasicMetric {
  value: number
  formatted?: string
}

export interface ChartDataPoint {
  date: string
  value: number
  label?: string
}

export interface RevenueChartData {
  month: string
  revenue: number
  appointments: number
  formatted?: string
}

export interface AppointmentChartData {
  date: string
  scheduled: number
  completed: number
  cancelled: number
  noShow: number
}

export interface PieChartData {
  name: string
  value: number
  percentage: number
  color?: string
}

export interface MainDashboardMetrics {
  // Main KPIs (top cards)
  kpis: {
    monthlyRevenue: KPIMetric
    totalPatients: {
      value: number
      active: number
      inactive: number
      new30Days: number
    }
    todayAppointments: {
      total: number
      completed: number
      pending: number
      cancelled: number
    }
    occupancyRate: KPIMetric
  }
  
  // Charts data
  charts: {
    revenueChart: RevenueChartData[]
    appointmentsChart: AppointmentChartData[]
    patientsSourceChart: PieChartData[]
  }
  
  // Widgets data
  widgets: {
    upcomingAppointments: DashboardAppointment[]
    birthdaysThisMonth: DashboardPatient[]
    recentPatients: DashboardPatient[]
    pendingPayments: DashboardPayment[]
    alerts: DashboardAlert[]
  }
}

// Simplified types for dashboard widgets
export interface DashboardAppointment {
  id: string
  patient_name: string
  patient_phone: string
  professional_name: string
  date: string
  start_time: string
  end_time: string
  consultation_type: string
  status: string
  is_today?: boolean
}

export interface DashboardPatient {
  id: string
  name: string
  phone: string
  birth_date?: string
  last_visit?: string
  total_visits: number
  status: string
  days_until_birthday?: number // For birthday widget
  created_at: string // For recent patients
}

export interface DashboardPayment {
  id: string
  patient_name: string
  patient_phone: string
  amount: number
  due_date: string
  days_overdue: number
  status: string
}

export interface DashboardAlert {
  id: string
  type: 'warning' | 'error' | 'info' | 'success'
  title: string
  message: string
  action?: string
  action_url?: string
  created_at: string
}

// Financial Dashboard Types
export interface FinancialDashboard {
  summary: {
    currentMonthRevenue: number
    lastMonthRevenue: number
    yearToDateRevenue: number
    averageTicket: number
    outstandingPayments: number
  }
  
  charts: {
    monthlyRevenue: RevenueChartData[]
    revenueByType: PieChartData[]
    paymentMethods: PieChartData[]
    revenueByProfessional: { name: string; value: number }[]
  }
  
  tables: {
    topPayingPatients: DashboardPatient[]
    overduePayments: DashboardPayment[]
    recentTransactions: Transaction[]
  }
}

export interface Transaction {
  id: string
  patient_name: string
  amount: number
  type: 'income' | 'expense'
  method: string
  date: string
  description: string
}

// Patients Dashboard Types
export interface PatientsDashboard {
  overview: {
    total: number
    active: number
    inactive: number
    archived: number
    retention: number
  }
  
  demographics: {
    ageDistribution: { ageGroup: string; count: number }[]
    genderDistribution: PieChartData[]
  }
  
  acquisition: {
    newPatientsChart: ChartDataPoint[]
    sourceDistribution: PieChartData[]
    conversionFunnel: { stage: string; count: number; rate: number }[]
  }
  
  engagement: {
    visitFrequency: { frequency: string; count: number }[]
    lastVisitDistribution: ChartDataPoint[]
    topPatients: DashboardPatient[]
  }
}

// Schedule Dashboard Types
export interface ScheduleDashboard {
  occupancy: {
    overall: number
    byProfessional: { name: string; rate: number }[]
    byDayOfWeek: { day: string; rate: number }[]
  }
  
  appointments: {
    totalThisMonth: number
    completionRate: number
    noShowRate: number
    cancellationRate: number
  }
  
  trends: {
    bookingTrends: ChartDataPoint[]
    consultationTypes: PieChartData[]
  }
}

// Dashboard filters
export interface DashboardFilters {
  period: 'today' | 'week' | 'month' | 'quarter' | 'year'
  startDate?: string
  endDate?: string
  professionalId?: string
  consultationTypeId?: string
}

// API Response types
export interface DashboardResponse<T> {
  data: T
  cached_at: string
  expires_at: string
}