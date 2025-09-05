import { createClient } from '@/lib/supabase/server'
import { KPICard } from "@/features/dashboard/components/cards/KPICard"
import { MetricCard } from "@/features/dashboard/components/cards/MetricCard"
import { RevenueChart } from "@/features/dashboard/components/charts/revenue-chart"
import { AppointmentsChart } from "@/features/dashboard/components/charts/appointments-chart"
import { UpcomingAppointmentsWidget } from "@/features/dashboard/components/widgets/upcoming-appointments-widget"
import { BirthdaysWidget } from "@/features/dashboard/components/widgets/birthdays-widget"
import { StatusCards } from "@/features/dashboard/components/status-cards"
import { ActionCards } from "@/features/dashboard/components/action-cards"
import { DashboardService } from "@/features/dashboard/services/dashboard.service"
import { redirect } from 'next/navigation'

interface DashboardPageData {
  clinic: {
    name: string
    phone: string
    specialties: string[]
  } | null
  subscription: {
    status: string
    plan_type: string
    stripe_current_period_end?: string
  } | null
  profile: {
    name: string
    email: string
    onboarding_status: string
  } | null
}


export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Fetch basic user data
  const [profileRes, clinicRes, subscriptionRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('clinics').select('*').eq('user_id', user.id).single(),
    supabase.from('subscriptions').select('*').eq('user_id', user.id).single()
  ])

  const data: DashboardPageData = {
    profile: profileRes.data,
    clinic: clinicRes.data,
    subscription: subscriptionRes.data
  }

  if (!data.clinic) {
    redirect('/onboarding')
  }

  // Fetch dashboard metrics
  const dashboardMetrics = await DashboardService.getMainDashboardMetrics(
    data.clinic.id,
    supabase
  )

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Bem-vindo, {data.profile?.name || 'Usuário'}!
        </h1>
        <p className="text-gray-600 mt-2">
          {data.clinic.name} - Painel de controle
        </p>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Receita Mensal"
          value={dashboardMetrics.kpis.monthlyRevenue.formatted || 'R$ 0,00'}
          change={dashboardMetrics.kpis.monthlyRevenue.change}
          trend={dashboardMetrics.kpis.monthlyRevenue.trend}
          period="vs. mês anterior"
        />
        
        <MetricCard
          title="Total de Pacientes"
          value={dashboardMetrics.kpis.totalPatients.value.toString()}
          subtitle={`${dashboardMetrics.kpis.totalPatients.active} ativos`}
          description={`${dashboardMetrics.kpis.totalPatients.new30Days} novos em 30 dias`}
        />
        
        <MetricCard
          title="Consultas Hoje"
          value={dashboardMetrics.kpis.todayAppointments.total.toString()}
          subtitle={`${dashboardMetrics.kpis.todayAppointments.completed} realizadas`}
          description={`${dashboardMetrics.kpis.todayAppointments.pending} pendentes`}
        />
        
        <KPICard
          title="Taxa de Ocupação"
          value={`${dashboardMetrics.kpis.occupancyRate.value.toFixed(1)}%`}
          change={dashboardMetrics.kpis.occupancyRate.change}
          trend={dashboardMetrics.kpis.occupancyRate.trend}
          period="média semanal"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <RevenueChart 
          data={dashboardMetrics.charts.revenueChart}
        />
        
        <AppointmentsChart 
          data={dashboardMetrics.charts.appointmentsChart}
        />
      </div>

      {/* Widgets Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <UpcomingAppointmentsWidget 
          appointments={dashboardMetrics.widgets.upcomingAppointments}
        />
        
        <BirthdaysWidget 
          patients={dashboardMetrics.widgets.birthdaysThisMonth}
        />
      </div>

      {/* Status Cards */}
      <StatusCards 
        clinic={data.clinic}
        subscription={data.subscription}
      />

      {/* Action Cards */}
      <ActionCards 
        clinic={data.clinic}
        subscription={data.subscription}
      />
    </>
  )
}