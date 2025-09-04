import { redirect } from "next/navigation"
import { createClient } from '@/lib/supabase/server'

interface AuthLayoutProps {
  children: React.ReactNode
}

export default async function AuthLayout({ children }: AuthLayoutProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Se o usuário já está logado, redireciona para o dashboard ou onboarding
  if (user) {
    // Buscar o status do onboarding do perfil
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_status')
      .eq('id', user.id)
      .single()
    
    const onboardingStatus = profile?.onboarding_status || "pending"
    
    if (onboardingStatus === "pending") {
      redirect("/onboarding/clinic-info")
    } else if (onboardingStatus === "clinic_info") {
      redirect("/onboarding/subscription")
    } else if (onboardingStatus === "completed") {
      redirect("/dashboard")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Sistema de Clínicas
            </h1>
            <p className="text-gray-600 mt-2">
              Gerencie sua clínica de forma profissional
            </p>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}