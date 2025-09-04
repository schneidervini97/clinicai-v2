import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, BarChart3, PieChart, TrendingUp, Target, MessageSquare, Users, TrendingDown } from "lucide-react"
import { MarketingDashboard } from "@/features/marketing/components/marketing-dashboard"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function RelatoriosPage() {
  const supabase = await createClient()

  // Get current user and clinic
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data: clinic } = await supabase
    .from('clinics')
    .select('id, name')
    .eq('user_id', user.id)
    .single()

  if (!clinic) {
    redirect('/onboarding')
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <p className="text-gray-600 mt-2">
          Análises e insights sobre sua clínica
        </p>
      </div>

      {/* Marketing Dashboard */}
      <div className="mb-8">
        <MarketingDashboard clinicId={clinic.id} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 0</div>
            <p className="text-xs text-muted-foreground">
              Faturamento atual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consultas</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pacientes Ativos</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Últimos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Ocupação</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--%</div>
            <p className="text-xs text-muted-foreground">
              Agenda
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Relatório Financeiro</CardTitle>
            <CardDescription>
              Análise de receitas e despesas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                Relatórios financeiros detalhados serão implementados para acompanhar a performance da clínica.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Análise de Pacientes</CardTitle>
            <CardDescription>
              Insights sobre base de pacientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                Análises demográficas e comportamentais dos pacientes em desenvolvimento.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Relatórios Disponíveis</CardTitle>
            <CardDescription>
              Tipos de relatórios que serão implementados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">Financeiros</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Receitas por período</li>
                  <li>• Análise de procedimentos</li>
                  <li>• Fluxo de caixa</li>
                  <li>• Inadimplência</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">Operacionais</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Taxa de ocupação</li>
                  <li>• Tempo médio de consulta</li>
                  <li>• Produtividade médica</li>
                  <li>• Satisfação do paciente</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}