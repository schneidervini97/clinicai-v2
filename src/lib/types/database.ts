export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          onboarding_status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          onboarding_status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          onboarding_status?: string
          created_at?: string
          updated_at?: string
        }
      }
      clinics: {
        Row: {
          id: string
          user_id: string
          name: string
          phone: string
          specialties: string[]
          cep: string
          address: string
          number: string
          complement: string
          city: string
          state: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          phone: string
          specialties: string[]
          cep: string
          address: string
          number: string
          complement?: string
          city: string
          state: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          phone?: string
          specialties?: string[]
          cep?: string
          address?: string
          number?: string
          complement?: string
          city?: string
          state?: string
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          stripe_price_id: string | null
          stripe_current_period_end: string | null
          status: string
          plan_type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          stripe_current_period_end?: string | null
          status?: string
          plan_type: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          stripe_current_period_end?: string | null
          status?: string
          plan_type?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}