import React from 'react'
import Link from 'next/link'
import { Settings, Users, Calendar, Clock, MapPin, CreditCard, Bell, Shield, Smartphone } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const configSections = [
  {
    title: 'Profissionais',
    description: 'Gerencie médicos, dentistas e outros profissionais da clínica',
    icon: Users,
    href: '/dashboard/configuracoes/profissionais',
    color: 'text-blue-600 bg-blue-100',
    available: true
  },
  {
    title: 'WhatsApp',
    description: 'Configure a integração com WhatsApp para chat com pacientes',
    icon: Smartphone,
    href: '/dashboard/configuracoes/whatsapp',
    color: 'text-green-600 bg-green-100',
    available: true
  },
  {
    title: 'Horários de Funcionamento',
    description: 'Configure horários de atendimento e disponibilidade',
    icon: Clock,
    href: '/dashboard/configuracoes/horarios',
    color: 'text-green-600 bg-green-100',
    available: false
  },
  {
    title: 'Tipos de Consulta',
    description: 'Personalize tipos de consulta e durações',
    icon: Calendar,
    href: '/dashboard/configuracoes/consultas',
    color: 'text-purple-600 bg-purple-100',
    available: false
  },
  {
    title: 'Dados da Clínica',
    description: 'Informações gerais, endereço e contato',
    icon: MapPin,
    href: '/dashboard/configuracoes/clinica',
    color: 'text-orange-600 bg-orange-100',
    available: false
  },
  {
    title: 'Pagamentos',
    description: 'Métodos de pagamento e configurações financeiras',
    icon: CreditCard,
    href: '/dashboard/configuracoes/pagamentos',
    color: 'text-red-600 bg-red-100',
    available: false
  },
  {
    title: 'Notificações',
    description: 'Configure lembretes e notificações automáticas',
    icon: Bell,
    href: '/dashboard/configuracoes/notificacoes',
    color: 'text-yellow-600 bg-yellow-100',
    available: false
  },
  {
    title: 'Segurança',
    description: 'Permissões de usuários e configurações de segurança',
    icon: Shield,
    href: '/dashboard/configuracoes/seguranca',
    color: 'text-gray-600 bg-gray-100',
    available: false
  }
]

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Configurações</h1>
      </div>

      <p className="text-muted-foreground">
        Gerencie as configurações da sua clínica e personalize o sistema de acordo com suas necessidades.
      </p>

      {/* Settings Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {configSections.map((section) => {
          const IconComponent = section.icon
          
          const content = (
            <Card className={`transition-all duration-200 ${
              section.available 
                ? 'hover:shadow-md cursor-pointer border-2 hover:border-primary/20' 
                : 'opacity-60 cursor-not-allowed'
            }`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg ${section.color}`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  {!section.available && (
                    <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                      Em breve
                    </span>
                  )}
                </div>
                <CardTitle className="text-lg">{section.title}</CardTitle>
                <CardDescription className="text-sm">
                  {section.description}
                </CardDescription>
              </CardHeader>
            </Card>
          )

          if (section.available) {
            return (
              <Link key={section.title} href={section.href}>
                {content}
              </Link>
            )
          }

          return (
            <div key={section.title}>
              {content}
            </div>
          )
        })}
      </div>

      {/* Help Text */}
      <Card className="mt-8">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <Settings className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">Precisa de ajuda?</h3>
              <p className="text-sm text-muted-foreground">
                As configurações permitem personalizar o sistema de acordo com o funcionamento da sua clínica. 
                Comece cadastrando os profissionais que atendem na clínica para poder criar agendamentos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}