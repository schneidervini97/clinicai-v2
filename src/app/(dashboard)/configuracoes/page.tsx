import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, User, Building2, CreditCard, Bell, Shield } from "lucide-react"

export default function ConfiguracoesPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-gray-600 mt-2">
          Gerencie as configurações da sua clínica
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Perfil do Usuário
            </CardTitle>
            <CardDescription>
              Gerencie suas informações pessoais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>• Dados pessoais</p>
              <p>• Foto de perfil</p>
              <p>• Alterar senha</p>
              <p>• Preferências</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Dados da Clínica
            </CardTitle>
            <CardDescription>
              Informações da sua clínica
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>• Nome da clínica</p>
              <p>• Endereço e contato</p>
              <p>• Especialidades</p>
              <p>• Horários de funcionamento</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Assinatura
            </CardTitle>
            <CardDescription>
              Gerencie seu plano e pagamentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>• Plano atual</p>
              <p>• Histórico de pagamentos</p>
              <p>• Alterar plano</p>
              <p>• Métodos de pagamento</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificações
            </CardTitle>
            <CardDescription>
              Configure alertas e lembretes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>• Lembretes de consulta</p>
              <p>• Notificações por email</p>
              <p>• Alertas do sistema</p>
              <p>• Configurações push</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Segurança
            </CardTitle>
            <CardDescription>
              Proteção e privacidade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>• Autenticação em duas etapas</p>
              <p>• Histórico de acessos</p>
              <p>• Backup de dados</p>
              <p>• Conformidade LGPD</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Sistema
            </CardTitle>
            <CardDescription>
              Configurações gerais do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>• Integrações</p>
              <p>• Backup automático</p>
              <p>• Logs do sistema</p>
              <p>• Suporte técnico</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Configurações em Desenvolvimento</CardTitle>
            <CardDescription>
              Funcionalidades que serão implementadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                Sistema completo de configurações será implementado para personalizar
                completamente o funcionamento da sua clínica.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}