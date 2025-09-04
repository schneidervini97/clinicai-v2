import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from '@/lib/supabase/admin'
import Stripe from 'stripe'

interface StripeSubscription extends Stripe.Subscription {
  current_period_end: number
}

interface StripeInvoice extends Stripe.Invoice {
  subscription: string
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get("stripe-signature")

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe signature" },
        { status: 400 }
      )
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
    } catch (error) {
      console.error("Webhook signature verification failed:", error)
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        // Retrieve the session with line items
        const sessionWithLineItems = await stripe.checkout.sessions.retrieve(
          session.id,
          { expand: ['line_items'] }
        )

        const customerId = session.customer as string
        const subscriptionId = session.subscription as string
        const userId = session.metadata?.userId

        if (!userId) {
          console.error("No userId found in session metadata")
          return NextResponse.json({ error: "No userId in metadata" }, { status: 400 })
        }

        // Get the price ID from line items
        const priceId = sessionWithLineItems.line_items?.data[0]?.price?.id

        if (!priceId) {
          console.error("No price ID found in session")
          return NextResponse.json({ error: "No price ID found" }, { status: 400 })
        }

        // Determine plan type based on price ID
        let planType = 'basic'
        if (priceId === 'price_1S1R8N5EyKnKUvjFyxmbmn4s') {
          planType = 'premium'
        }

        // Create or update subscription in database
        const { error: upsertError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            stripe_price_id: priceId,
            status: 'active',
            plan_type: planType,
          }, {
            onConflict: 'user_id'
          })

        if (upsertError) {
          console.error("Error updating subscription:", upsertError)
          return NextResponse.json({ error: "Database error" }, { status: 500 })
        }

        // Update user onboarding status
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ onboarding_status: 'completed' })
          .eq('id', userId)

        if (profileError) {
          console.error("Error updating profile:", profileError)
        }

        console.log(`Subscription created/updated for user: ${userId}`)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Find user by customer ID
        const { data: subscriptionData } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (subscriptionData) {
          const { error } = await supabase
            .from('subscriptions')
            .update({
              status: subscription.status,
              stripe_current_period_end: new Date((subscription as StripeSubscription).current_period_end * 1000).toISOString(),
            })
            .eq('user_id', subscriptionData.user_id)

          if (error) {
            console.error("Error updating subscription:", error)
          } else {
            console.log(`Subscription updated for customer: ${customerId}`)
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Find user by customer ID
        const { data: subscriptionData } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (subscriptionData) {
          const { error } = await supabase
            .from('subscriptions')
            .update({ status: 'canceled' })
            .eq('user_id', subscriptionData.user_id)

          if (error) {
            console.error("Error updating subscription:", error)
          } else {
            console.log(`Subscription canceled for customer: ${customerId}`)
          }
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as StripeInvoice
        const customerId = invoice.customer as string
        const subscriptionId = invoice.subscription

        if (subscriptionId) {
          // Find user by customer ID
          const { data: subscriptionData } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .single()

          if (subscriptionData) {
            const { error } = await supabase
              .from('subscriptions')
              .update({
                status: 'active',
                stripe_current_period_end: new Date(invoice.period_end * 1000).toISOString(),
              })
              .eq('user_id', subscriptionData.user_id)

            if (error) {
              console.error("Error updating subscription after payment:", error)
            } else {
              console.log(`Payment succeeded for customer: ${customerId}`)
            }
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        // Find user by customer ID
        const { data: subscriptionData } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (subscriptionData) {
          const { error } = await supabase
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('user_id', subscriptionData.user_id)

          if (error) {
            console.error("Error updating subscription after failed payment:", error)
          } else {
            console.log(`Payment failed for customer: ${customerId}`)
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }
}