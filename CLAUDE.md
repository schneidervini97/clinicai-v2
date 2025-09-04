# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start development server with Turbopack
npm run dev

# Build for production with Turbopack
npm run build

# Start production server
npm start

# Run ESLint
npm run lint

# Pre-commit validation (run before commits)
npm run lint && npm run build
```

### Database Migrations

Run these SQL files in Supabase SQL Editor in order:
1. `database-migration.sql` - Core tables (profiles, clinics, subscriptions)
2. `database-migration-patients.sql` - Patient module tables
3. `database-migration-appointments.sql` - Appointments system tables (professionals, appointments, schedules)
4. `database-migration-availability.sql` - Professional availability configuration (optional, for flexible scheduling)
5. `database-migration-chat.sql` - WhatsApp chat system tables and functions
6. `database-migration-chat-media.sql` - Media metadata fields for chat messages
7. `database-migration-chat-media-base64.sql` - Base64 media storage and processing queue
8. `database-migration-marketing.sql` - Marketing leads and campaign tracking (Meta Ads, Google Ads)
9. `enable-realtime-tables.sql` - **CRITICAL**: Enable Supabase Realtime for WhatsApp tables

## Architecture Overview

This is a **clinic management system** built with Next.js 15, using App Router, TypeScript, and Turbopack. The system follows a **SaaS model** with user registration, onboarding flow, and Stripe subscriptions.

### Core Architecture Stack

- **Frontend**: Next.js 15.5.2 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **Authentication**: Supabase Auth (migrated from NextAuth.js)
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Payments**: Stripe v18 with webhooks for subscription management
- **Forms**: React Hook Form + Zod validation

### Key Architectural Patterns

#### 1. Route-based Authentication Flow
- **`(auth)`** route group: Public auth pages (login/register) with layout that redirects authenticated users
- **`(dashboard)`** route group: Protected pages that require authentication
- **Middleware**: Handles route protection and auth redirects using Supabase SSR

#### 2. Supabase Integration Pattern
- **Server components**: Use `await createClient()` from `@/lib/supabase/server`
- **Client components**: Use `createClient()` from `@/lib/supabase/client`
- **Middleware**: Direct Supabase client instantiation for auth checks

#### 3. Onboarding Flow Architecture
Three-stage onboarding with database state tracking:
1. **`pending`**: User registered, needs clinic info
2. **`clinic_info`**: Clinic data saved, needs subscription 
3. **`completed`**: Full setup done, access to dashboard

User redirected automatically based on `profiles.onboarding_status`.

#### 4. Stripe Integration Architecture
- **Checkout Sessions**: Created via `/api/stripe/create-checkout-session`
- **Webhooks**: Handle subscription events at `/api/stripe/webhooks`
- **Database Sync**: Webhooks update `subscriptions` table with Stripe data
- **API Version**: Uses `2025-08-27.basil` (latest stable)

### Database Schema (Supabase)

#### Core Tables (database-migration.sql)
```sql
profiles        # Extends auth.users with onboarding_status
clinics         # Clinic information (1:1 with users)
subscriptions   # Stripe subscription data (1:1 with users)
```

#### Patient Module Tables (database-migration-patients.sql)
```sql
patients               # Main patient records with personal/medical data
patient_documents      # File attachments for patients
patient_history        # Audit log for patient changes
pipeline_history       # Sales funnel tracking
financial_transactions # Payment and billing records
patient_stats          # Aggregated statistics view
```

#### Appointments Module Tables (database-migration-appointments.sql)
```sql
professionals          # Healthcare providers with specialties and registration numbers
professional_schedules # Weekly working hours template (weekday-based)
schedule_exceptions    # Holidays, vacations, and other schedule exceptions
appointments          # Scheduled appointments with status and type tracking
appointment_history   # Audit log for appointment changes
availability          # Flexible time slot configuration per professional (optional)
```

All tables use RLS policies for multi-tenant access control.

### Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=    # For admin operations (webhooks)
STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=          # For Stripe redirects (http://localhost:3000)
```

### Brazilian Localization Features

- **CEP Integration**: Automatic address lookup via ViaCEP API (`/api/address/cep/[cep]`)
- **Brazilian Masks**: CPF, phone, CEP, RG formatting in `@/lib/masks`
- **CPF Validation**: Full algorithm validation in Zod schemas
- **Phone Handling**: Supports both landline (10 digits) and mobile (11 digits) formats
- **Medical Specialties**: Pre-defined list for Brazilian healthcare system

### Important Implementation Notes

#### Next.js 15 Compatibility
- Supabase server client uses `await cookies()` pattern for Next.js 15 compatibility
- All `createClient()` calls in server components must be awaited
- **Dynamic params are Promises**: In Next.js 15, `params` in pages, layouts, and API routes must be awaited:
  ```typescript
  // Correct pattern
  export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    // use id...
  }
  ```
- **Server Action Redirect Pattern**: `redirect()` throws NEXT_REDIRECT internally and must be called outside try/catch:
  ```typescript
  // Correct pattern
  async function handleAction(data: FormData) {
    'use server'
    
    let result
    try {
      result = await someOperation(data)
    } catch (error) {
      throw new Error('Operation failed')
    }
    
    // Redirect outside try/catch
    redirect(`/success/${result.id}`)
  }
  ```

#### Webhook Security
Stripe webhooks verify signatures and handle these events:
- `checkout.session.completed`: Create subscription record
- `customer.subscription.updated/deleted`: Update subscription status
- `invoice.payment_succeeded/failed`: Update payment status

**Important**: Webhooks use the admin client (`createAdminClient()`) to bypass RLS policies.

#### Route Protection Logic
Middleware handles comprehensive authentication and onboarding enforcement:
- Prevents authenticated users from accessing auth pages (`/login`, `/register`)
- Redirects unauthenticated users from protected routes (`/dashboard`, `/onboarding`)
- **Onboarding Enforcement**: Checks `profiles.onboarding_status` and redirects accordingly:
  - `pending` → `/onboarding/clinic-info`
  - `clinic_info` → `/onboarding/subscription`
  - `completed` → Allows dashboard access
- Must return the exact `supabaseResponse` object to maintain session state

### Dashboard Architecture

The dashboard uses shadcn/ui sidebar pattern with route groups:

#### Sidebar Navigation Structure
- **Layout**: `/src/app/(dashboard)/layout.tsx` wraps content with `SidebarProvider`
- **Component**: `/src/components/app-sidebar.tsx` defines navigation items
- **Pages**: Each navigation item has its own route:
  - `/dashboard` - Main dashboard (default)
  - `/dashboard/chat` - Communication system
  - `/dashboard/pipeline` - Sales funnel management  
  - `/dashboard/agenda` - Appointment scheduling
  - `/dashboard/clientes` - Patient management
  - `/dashboard/relatorios` - Analytics and reports
  - `/dashboard/configuracoes` - System settings

#### Sidebar Implementation Pattern
- Uses `SidebarProvider` for state management
- `SidebarInset` for proper content spacing
- `SidebarTrigger` for mobile responsiveness
- User dropdown in footer with Supabase auth integration

## Feature Module Architecture

The system uses a modular architecture pattern for organizing features, as demonstrated by the patient and appointments modules:

### Module Structure (`/src/features/[feature]/`)
```
features/patients/
├── components/       # Feature-specific UI components
├── services/        # Business logic and data access
├── types/          # TypeScript interfaces and schemas
├── hooks/          # Custom React hooks (optional)
└── utils/          # Feature-specific utilities (optional)
```

### Service Layer Pattern
Each feature has a service class that handles all data operations. **Important**: Always pass the Supabase client to service methods to ensure proper authentication:
```typescript
export class PatientService {
  static async create(data: PatientInput, supabase: SupabaseClient): Promise<Patient>
  static async findById(id: string, supabase: SupabaseClient): Promise<Patient | null>
  static async search(filters: PatientFilters, pagination?: PaginationParams, supabase: SupabaseClient): Promise<PatientSearchResult>
  static async update(id: string, updates: Partial<PatientInput>, supabase: SupabaseClient): Promise<Patient>
  // ... other CRUD operations
}

export class ProfessionalService {
  static async list(filters: ProfessionalFilters, pagination?: PaginationParams, supabase: SupabaseClient): Promise<Professional[]>
  static async create(data: CreateProfessionalInput, supabase: SupabaseClient): Promise<Professional>
  static async findById(id: string, supabase: SupabaseClient): Promise<Professional | null>
  // ... other operations
}

export class AvailabilityService {
  static async getByProfessionalId(professionalId: string, supabase: SupabaseClient): Promise<Availability[]>
  static async create(data: CreateAvailabilityInput, supabase: SupabaseClient): Promise<Availability>
  // ... other operations
}
```

**Authentication Pattern**: Server components should pass their authenticated client:
```typescript
export default async function Page() {
  const supabase = await createClient()
  const patient = await PatientService.findById(id, supabase) // ✅ Authenticated
  
  // For appointments module
  const professionals = await ProfessionalService.list({}, {}, supabase) // ✅ Returns array
  // NOT: professionals.data (this will be undefined)
}
```

### API Routes Pattern
- **Collection routes**: `/api/[feature]/route.ts` (GET, POST)
- **Resource routes**: `/api/[feature]/[id]/route.ts` (GET, PUT, DELETE)
- All routes use Zod validation and proper error handling in Portuguese

### Form Handling Pattern
- **React Hook Form** + **Zod** for validation
- **Brazilian masks** applied in real-time (CPF, phone, CEP)
- **Auto-completion** for address fields via CEP lookup
- **Dynamic arrays** for tags, allergies, medications
- **LGPD compliance** checkboxes integrated

### Database Design Patterns
- **Multi-tenant RLS** policies on all tables
- **Audit logging** with automatic triggers
- **Soft delete** support (archive/restore)
- **Foreign key constraints** with CASCADE deletes
- **Aggregate views** for performance (e.g., `patient_stats`)

### TypeScript Patterns
- **Interface segregation**: Separate types for input, output, filters
- **Zod schema validation**: Brazilian-specific validations (CPF algorithm)
- **Type inference**: Export inferred types from schemas
- **Utility types**: Formatting functions for currency, dates, phones

## Common Pitfalls and Solutions

### 1. NEXT_REDIRECT Errors
**Problem**: `redirect()` calls inside try/catch blocks cause console errors.
**Solution**: Always call `redirect()` outside try/catch blocks as shown in the server action pattern above.

### 2. Authentication Failures in Services  
**Problem**: Service methods fail with "User not authenticated" when called from server components.
**Solution**: Always pass the authenticated Supabase client from server components to service methods.

### 3. Hydration Mismatch with Radix UI
**Problem**: Radix UI components generate different IDs on server vs client, causing hydration warnings.
**Solution**: Add `suppressHydrationWarning` prop to problematic components:
```tsx
<DropdownMenu suppressHydrationWarning>
  {/* content */}
</DropdownMenu>
```

### 4. Next.js 15 Params Access
**Problem**: Direct access to `params.id` in pages/layouts causes warnings.
**Solution**: Always await params first:
```typescript
// Before (causes warnings)
export default function Page({ params }) {
  const id = params.id
}

// After (correct)
export default async function Page({ params }) {
  const { id } = await params
}
```

### 5. SelectItem Cannot Have Empty Value
**Problem**: `<SelectItem value="">` causes runtime error: "A <Select.Item /> must have a value prop that is not an empty string."
**Solution**: Use a div for empty state messages instead of SelectItem:
```tsx
// Wrong - causes runtime error
<SelectItem value="" disabled>
  No items found
</SelectItem>

// Correct - use div for empty state
<div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
  No items found
</div>
```

### 6. Professional Data Structure Mismatch
**Problem**: Service returns array but code expects object with .data property.
**Solution**: Check service return type - `ProfessionalService.list()` returns array directly:
```typescript
// ✅ Correct - service returns array
const professionals = await ProfessionalService.list({}, {}, supabase)

// ❌ Wrong - will be undefined
const professionals = professionalsResult.data
```

### 7. Time Field Format from Database
**Problem**: TIME fields from PostgreSQL may include seconds (HH:MM:SS), but UI expects HH:MM.
**Solution**: Use substring to ensure HH:MM format:
```tsx
<Select
  value={slot.start_time ? slot.start_time.substring(0, 5) : ''}
  // ...
>
```

### 8. Appointments Module Implementation Status
The appointments module is **fully implemented** with complete scheduling system:
- ✅ **Professional Management**: CRUD operations in `/dashboard/configuracoes/profissionais`
- ✅ **Availability Configuration**: Flexible scheduling in `/dashboard/configuracoes/profissionais/[id]/horarios`
- ✅ **Calendar Views**: Day, week, month views in `/dashboard/agenda`
- ✅ **Appointment Booking**: Modal form with professional and patient selection
- ✅ **Database Integration**: Complete schema with RLS policies

### 9. Calendar Component Architecture
**Location**: `/src/features/appointments/components/calendar/`
- **DayView**: Hourly time slots with appointment display
- **WeekView**: 7-day grid with hover effects (fixed alignment issues)
- **MonthView**: Monthly calendar with appointment counts
- **Common Pattern**: All views handle appointment clicks and time slot selection

### 10. Patient Module Status
The patient module is **fully implemented** with complete CRUD operations:
- ✅ **Listing**: `/dashboard/clientes` shows all patients
- ✅ **Creation**: `/dashboard/clientes/novo` with full form validation
- ✅ **Viewing**: `/dashboard/clientes/[id]` displays patient details
- ✅ **Editing**: `/dashboard/clientes/[id]/editar` updates patient data
- ✅ **Brazilian Validation**: CPF, phone, CEP with proper masks and validation

### 11. Supabase Error Handling Pattern
**PGRST116 (No Rows Found)**: This is a normal response from Supabase when using `.single()` and no data exists. Don't log as error:
```typescript
if (error) {
  if (error.code === 'PGRST116') {
    // Normal case - no data found, don't log
    return null
  } else if (error.code === '42501' || error.message?.includes('insufficient privilege')) {
    // RLS policy blocking access
    console.warn('RLS Error:', { hint: 'Check RLS policies' })
  } else {
    // Actual error - log with proper stringification
    console.error('Database error:', {
      error: JSON.stringify(error),
      code: error.code,
      message: error.message
    })
  }
}
```

### 12. Availability Service Logic Architecture
**Core Flow for Checking Available Time Slots**:

1. **`AvailabilityService.getAvailableSlots()`** (`/features/appointments/services/availability.service.ts:154-237`)
   - **Input**: `professionalId`, `date`, `duration`, `supabase`
   - **Output**: Array of `AvailabilitySlot[]` with `time`, `available`, `professional_id`, `duration`
   - **Logic**: Queries appointments table for existing bookings, generates time slots, marks availability

2. **`ProfessionalService.getWorkingHours()`** (`/features/appointments/services/professional.service.ts:357-459`)
   - **Input**: `professionalId`, `date`, `supabase`
   - **Output**: `{ start: string, end: string, duration: number } | null`
   - **Logic**: Checks schedule_exceptions first, then professional_schedules for weekday

3. **Time Slot Generation Logic**:
   - Morning slots: `working_hours.start` to `lunch_start` (or `working_hours.end` if no lunch)
   - Afternoon slots: `lunch_end` to `working_hours.end` (if lunch exists)
   - Each slot duration based on `professional_schedules.appointment_duration` or parameter default
   - Availability determined by absence from existing appointments

**Important**: If no `professional_schedules` exist for a professional, `getWorkingHours()` returns `null`, causing `getAvailableSlots()` to return empty array. Consider adding default working hours for better UX.

### 13. Database Query Performance Patterns
- **Multi-tenant filtering**: Always filter by `clinic_id` to ensure tenant isolation
- **RLS policies**: Enable on all tables for automatic tenant filtering
- **Index recommendations**:
  ```sql
  -- For appointments availability queries
  CREATE INDEX idx_appointments_professional_date ON appointments(professional_id, date);
  CREATE INDEX idx_professional_schedules_lookup ON professional_schedules(professional_id, weekday, active);
  CREATE INDEX idx_schedule_exceptions_lookup ON schedule_exceptions(professional_id, date);
  ```

### 14. React Hook Dependencies and Performance
**Problem**: Complex search components with debouncing can cause infinite re-render loops.
**Solution**: Properly memoize dependencies and avoid recreating objects:
```typescript
// ✅ Correct - memoize Supabase client
const supabase = useMemo(() => createClient(), [])

// ✅ Correct - memoize functions with useCallback
const searchFunction = useCallback(async (query: string) => {
  // search logic
}, [supabase])

// ✅ Correct - debounce with proper dependencies
const debouncedSearch = useMemo(
  () => debounce(searchFunction, 300),
  [searchFunction]
)

// ❌ Wrong - recreates client on every render
const supabase = createClient()
```

### 15. Form Component Architecture Pattern
For appointment forms and similar complex forms, prefer simple Select components over complex search components:

**Simple Pattern (Recommended)**:
```typescript
// Pre-load data in parent component
const patients = await PatientService.search({}, { per_page: 100 }, supabase)

// Use simple Select in form
<Select onValueChange={field.onChange} value={field.value}>
  <SelectTrigger>
    <SelectValue placeholder="Selecione o paciente" />
  </SelectTrigger>
  <SelectContent>
    {patients.map((patient) => (
      <SelectItem key={patient.id} value={patient.id}>
        {patient.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

**Complex Pattern (Use Only When Necessary)**:
- Custom search components with debouncing
- Async loading states
- Complex filtering logic
- Large datasets requiring pagination

### 16. Appointment System Architecture
The appointment system uses two main tables for availability:
- **`professional_schedules`**: Weekly template for working hours (primary source)
- **`availability`**: Optional flexible time slots (deprecated, prefer schedules)

**Critical**: Always check `professional_schedules` table first. If no schedules exist for a professional, the availability system returns empty arrays. The correct data flow is:

1. `ProfessionalService.getWorkingHours()` checks `schedule_exceptions` first, then `professional_schedules`
2. `AvailabilityService.getAvailableSlots()` uses working hours to generate time slots
3. Calendar components display available slots based on this data

**Configuration Flow**: `/dashboard/configuracoes/profissionais/[id]/horarios` manages `professional_schedules` table.

### 17. Calendar View UI Performance and Layout
The calendar components (WeekView, DayView, MonthView) have specific size and overflow patterns that have been optimized:

**Week View Slot Sizing**:
```tsx
// Slot containers
className="grid grid-cols-8 h-[90px] overflow-hidden"

// Appointment containers (no scroll restrictions)
className="w-full space-y-1 p-1"  // No max-height or overflow-y-auto

// AppointmentCard (natural height)  
className="w-full p-2 rounded-md ... overflow-hidden"  // No max-height restriction
```

**Time Display Pattern**: Show intervals instead of single times for better UX:
```tsx
// Display: "08:00 - 08:30" instead of just "08:00"
{time} - {getNextTimeSlot(time)}
```

**Critical Layout Rules**:
- Calendar uses dynamic height: `h-[calc(100vh-300px)]` to utilize available screen space
- Slot heights are fixed (90px) to prevent expansion but accommodate content naturally
- Remove `max-height` and `overflow-y-auto` from appointment containers to prevent unwanted scrolling
- AppointmentCard should not have `max-height` restrictions to show full content

### 18. Form Performance Patterns - Patient/Professional Selection
Recent optimization work revealed critical patterns for form components:

**Preferred Architecture**: Pre-load data and use simple Select components:
```tsx
// Load data in server/parent component
const patients = await PatientService.search({}, { per_page: 100 }, supabase)

// Use simple shadcn Select in forms
<Select onValueChange={field.onChange} value={field.value}>
  <SelectContent>
    {patients.map(patient => (
      <SelectItem key={patient.id} value={patient.id}>
        {patient.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

**Avoid Complex Search Components** unless necessary:
- Complex debounced search components can cause infinite loops
- useCallback/useMemo dependencies with Supabase clients need careful handling
- Simple Select is faster, more reliable, and provides better UX for most use cases

### 19. Pipeline Sales Funnel System
The pipeline system implements a Kanban-style sales funnel to track patient journey from leads to active patients.

**Pipeline Stages Flow**:
```
LEAD → CONTATO_INICIAL → AGENDAMENTO → COMPARECIMENTO → FECHAMENTO → DESISTENCIA
```

**Database Integration**:
- Uses `patients.pipeline_stage` and `patients.pipeline_entered_at` columns
- Records history in `pipeline_history` table
- Filters using `status != 'archived'` (not a boolean archived column)

**Component Architecture**:
```typescript
/features/pipeline/
├── types/pipeline.types.ts          // Stage configs with colors and icons
├── services/pipeline.service.ts     // CRUD operations and board data
└── components/
    ├── pipeline-board.tsx          // Main Kanban board with drag & drop
    ├── pipeline-column.tsx         // Individual stage columns
    └── pipeline-card.tsx           // Patient cards with actions
```

**Key Implementation Patterns**:
```typescript
// Correct type for mapped object
export type PipelineBoardData = Record<PipelineStage, PipelinePatient[]>

// Drag & drop using HTML5 API
onDragStart={(e) => e.dataTransfer.setData('text/plain', patient.id)}

// Stage visual styling with overflow handling
<Card className="overflow-hidden">
  <CardHeader className="p-3 bg-blue-50 border-b rounded-t-lg">
```

**Database Setup Required**:
```sql
ALTER TABLE patients 
ADD COLUMN pipeline_stage TEXT DEFAULT 'LEAD',
ADD COLUMN pipeline_entered_at TIMESTAMP DEFAULT NOW();
```

**Critical Points**:
- Always use `Record<K, V>` instead of `interface { [key in K]: V }` for mapped types
- Column filtering uses `status` field, not `archived` boolean
- Cards show days in stage with color coding (green ≤3, yellow ≤7, red >7)
- Optimistic UI updates with error rollback on failed moves

### 20. WhatsApp Chat System
The chat system integrates with Evolution API to provide real-time WhatsApp messaging for patient communication.

**System Architecture**:
- **Evolution API v2.3.1**: WhatsApp Web integration
- **Supabase Realtime**: Real-time message synchronization
- **Webhook Processing**: Handles incoming messages from Evolution API
- **Multi-tenant**: Each clinic has isolated chat data with RLS policies

**Database Tables**:
```sql
whatsapp_connections    # WhatsApp instance configuration per clinic
conversations          # Chat threads between clinic and patients
messages               # Individual messages with media support
whatsapp_contacts      # Contacts not yet registered as patients
chat_stats            # Aggregated statistics view
```

**Component Architecture**:
```typescript
/features/chat/
├── types/chat.types.ts              // TypeScript interfaces
├── services/
│   ├── evolution.service.ts         // Evolution API integration
│   └── chat.service.ts             // Database operations
├── hooks/
│   ├── useRealtimeMessages.ts      // Real-time message subscriptions
│   └── useWhatsAppConnection.ts    // Connection status management
└── components/
    ├── conversation-list.tsx       // Conversation sidebar
    ├── chat-window.tsx            // Main chat interface
    ├── message-bubble.tsx         // Message display
    ├── message-input.tsx          // Message composition
    └── whatsapp-connection.tsx    // QR code and connection setup
```

**Key Integration Patterns**:
```typescript
// Evolution API message sending
await EvolutionService.sendTextMessage(instanceName, {
  number: phone,
  message: content
})

// Real-time message subscription
const { messages } = useRealtimeMessages({
  conversationId,
  onNewMessage: (message) => updateUI(message)
})

// Webhook event processing
export async function POST(request: NextRequest) {
  const body: EvolutionWebhookEvent = await request.json()
  
  switch (body.event) {
    case 'MESSAGES_UPSERT':
      await handleMessageUpsert(body.data)
      break
    case 'CONNECTION_UPDATE':
      await handleConnectionUpdate(body.data)
      break
  }
}
```

**Environment Variables Required**:
```env
# Evolution API (server-side only - NOT NEXT_PUBLIC)
EVOLUTION_API_URL=https://your-evolution-instance.com
EVOLUTION_API_KEY=your_api_key

# Webhook URL configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000  # For webhook URL
```

**Setup Process**:
1. **Database Migration**: Run `database-migration-chat.sql`
2. **Environment Setup**: Configure Evolution API credentials
3. **Connection Creation**: Clinic creates WhatsApp instance via `/dashboard/configuracoes/whatsapp`
4. **QR Code Scan**: Connect WhatsApp by scanning generated QR code
5. **Webhook Configuration**: System automatically configures webhooks for real-time events

**Message Types Supported**:
- Text messages
- Images with captions
- Videos with captions  
- Audio messages
- Documents/PDFs
- Stickers
- Location sharing
- Contact cards

**Real-time Features**:
- **Message Delivery**: Instant message display using Supabase Realtime
- **Status Updates**: Read receipts and delivery confirmations
- **Typing Indicators**: Real-time presence information
- **Connection Status**: Live WhatsApp connection monitoring
- **Unread Counters**: Dynamic unread message badges

**Patient Integration**:
- **Auto-linking**: Automatically links messages to existing patients by phone
- **Contact Creation**: Creates WhatsApp contacts for unknown numbers
- **Patient Search**: Link conversations to existing patients manually
- **Conversation History**: Maintains full message history per patient

**Security & Multi-tenancy**:
- **Row Level Security**: All chat tables use RLS for clinic isolation
- **API Proxy Security**: Evolution API credentials kept server-side only
- **Authentication Required**: All Evolution API calls require Supabase authentication
- **Instance Isolation**: Each clinic has unique Evolution instance
- **Admin Client**: Uses service role key for webhook processing
- **Secure Proxy**: `/api/evolution/[...path]` proxy prevents credential exposure

**Critical Implementation Notes**:
- **Phone Number Format**: Always use `EvolutionService.formatPhoneNumber()` for Brazilian numbers
- **Real-time Subscriptions**: Use conversation-specific channels to avoid excessive updates
- **Error Handling**: Implement retry logic for failed message sends
- **Media Processing**: Handle different media types with appropriate UI components
- **Connection Recovery**: Automatic QR code refresh when connection drops

**Webhook Endpoint**: `/api/webhooks/evolution` handles all Evolution API events
**Configuration Pages**: 
- `/dashboard/configuracoes/whatsapp` - Connection setup
- `/dashboard/chat` - Main chat interface

### 21. WhatsApp Media Processing with Base64
The system implements sophisticated media handling using Evolution API's `getBase64FromMediaMessage` endpoint to ensure reliable media storage and display.

**Architecture Overview**:
- **Immediate Response**: Webhook saves message with thumbnail for instant UI feedback
- **Background Processing**: Fetches full base64 media without blocking webhook
- **Progressive Loading**: UI shows thumbnail first, then full media when ready
- **Queue System**: Manual retry for failed media processing

**Database Schema Extensions**:
```sql
-- Media metadata (database-migration-chat-media.sql)
media_mime_type, media_size, media_width, media_height, media_duration
media_thumbnail, media_waveform, is_voice_note

-- Base64 storage (database-migration-chat-media-base64.sql)  
media_base64 TEXT                    -- Full media in data URL format
media_processing_status VARCHAR(20)   -- pending, processing, completed, failed
```

**Evolution Service Integration**:
```typescript
// Get full base64 media from Evolution API
const mediaResponse = await EvolutionService.getBase64FromMediaMessage(
  instanceName,
  { id: messageKey.id },
  convertToMp4  // true for videos
)

// Create data URL for direct browser use
const dataUrl = `data:${mediaResponse.mimetype};base64,${mediaResponse.media}`
```

**Processing Flow**:
1. **Webhook Receives Message** → Save with thumbnail + metadata instantly
2. **Background Process** → Call `getBase64FromMediaMessage` asynchronously  
3. **Update Message** → Store full base64 when processing completes
4. **Real-time Update** → UI automatically shows full media via Supabase Realtime

**Media Types Handled**:
- **Images**: JPEG/PNG with thumbnail preview → Full resolution base64
- **Videos**: Thumbnail + play button → MP4 base64 (converted by Evolution)
- **Audio**: Waveform visualization → Full audio base64 (voice notes vs music)
- **Documents**: File icon + name → Download via base64

**Queue Processing**:
- **API Endpoint**: `/api/chat/process-media-queue` - Reprocess failed media
- **Manual Trigger**: "Processar Mídia" button in chat interface
- **Size Limits**: 10MB base64 maximum (≈7.5MB file size)
- **Retry Logic**: Automatic retry for transient failures

**UI Components Pattern**:
```typescript
// Prioritized media source selection
const getMediaSource = () => {
  if (message.media_base64) return message.media_base64      // 1st priority
  if (message.media_url?.startsWith('http')) return message.media_url  // 2nd priority  
  if (message.media_thumbnail) return `data:image/jpeg;base64,${message.media_thumbnail}` // Fallback
  return null
}

// Progressive loading states
{!hasFullMedia && <ThumbnailWithSpinner />}
{hasFullMedia && <FullMediaComponent />}
```

**Performance Optimizations**:
- **Thumbnail First**: Instant loading with blurred placeholder
- **Lazy Loading**: Full media loads only when thumbnail is ready
- **Background Processing**: Never blocks webhook response time
- **Caching Strategy**: Base64 stored permanently, no URL expiration issues

**Troubleshooting**:
- **Failed Processing**: Use "Processar Mídia" button to retry queue
- **Large Files**: Check 10MB limit, consider external storage for bigger files  
- **Connection Issues**: Verify Evolution API connectivity and credentials
- **Browser Compatibility**: All modern browsers support base64 data URLs

### 22. Supabase Realtime Configuration
**CRITICAL**: For real-time features to work (WhatsApp chat, live updates), tables must be added to the `supabase_realtime` publication.

**Required Setup**:
```sql
-- Enable Supabase Realtime for chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_connections;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

**Verification**:
```sql
-- Check tables in publication
SELECT schemaname, tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND schemaname = 'public'
ORDER BY tablename;
```

**Real-time Subscription Pattern**:
```typescript
// Correct subscription setup
const channel = supabase
  .channel(`messages_${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`,
  }, (payload) => {
    // Handle new message
  })
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('✅ Real-time is working!')
    }
  })
```

**Troubleshooting**:
- If pages require manual refresh, check if tables are in `supabase_realtime` publication
- Real-time subscriptions need proper RLS policies for multi-tenant access
- Use conversation/clinic-specific channel names to avoid cross-tenant data leaks

### 22. Chat Real-time Message Reload Fix
**CRITICAL**: When implementing real-time chat features, avoid full message reloads when sending messages.

**Root Causes Identified**:
1. **Supabase client in useEffect dependencies** causes unnecessary re-runs
2. **Non-memoized Supabase clients** trigger object recreation on re-renders
3. **Conversation object reference changes** when properties update

**Problem Pattern**: Chat reloading all messages when sending because useEffect dependencies change:
```typescript
// ❌ Wrong - causes full reload 
useEffect(() => {
  // Load messages...
}, [conversationId, supabase]) // supabase reference changes

// ❌ Wrong - recreates client on every render
const supabase = createClient()
```

**Solution Pattern**: Remove unstable dependencies and memoize clients:
```typescript
// ✅ Correct - memoize Supabase client
const supabase = useMemo(() => createClient(), [])

// ✅ Correct - stable conversation ID state
const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>()

useEffect(() => {
  setSelectedConversationId(selectedConversation?.id)
}, [selectedConversation?.id])

// ✅ Correct - remove supabase from dependencies
useEffect(() => {
  // Load messages...
}, [conversationId]) // Only conversationId

// ✅ Correct - use stable ID in hook
const { messages } = useRealtimeMessages({
  conversationId: selectedConversationId,  // Stable string value
  // ...
})
```

**Implementation Steps**:
1. **Memoize Supabase clients** with `useMemo(() => createClient(), [])`
2. **Remove `supabase` from useEffect dependencies** (client is already memoized)
3. **Use stable conversation ID** state separate from conversation object
4. **Add debug logs** to verify no unnecessary reloads

**Files Modified**:
- `/src/features/chat/hooks/useRealtimeMessages.ts` - Remove supabase dependency
- `/src/app/(dashboard)/dashboard/chat/client.tsx` - Memoize Supabase client

**Verification**: Check console logs for `🔄 useEffect triggered` - should only appear when switching conversations, not when sending messages.

### 23. Marketing Lead Tracking System
The system includes comprehensive marketing attribution tracking for Meta Ads and Google Ads campaigns.

**Database Schema** (`database-migration-marketing.sql`):
```sql
marketing_campaigns       # Campaign configuration for each platform
marketing_leads          # Lead tracking with conversion funnel
marketing_conversions    # Event tracking throughout lead lifecycle
```

**Automatic Lead Detection**:
- **Meta Ads**: Automatic detection from Evolution webhook `referral` context data
- **Google Ads**: UTM parameter detection and GA-XXXXXXXX protocol tracking
- **Organic**: WhatsApp messages without marketing attribution

**Lead Tracking Flow**:
```
New Message (Inbound) → MarketingService.processEvolutionMessage() 
→ Detect Source (Meta/Google/Organic) → Create Lead → Track Conversions
```

**Google Ads Integration**:
The system supports two methods for Google Ads tracking:

1. **UTM Parameters in Messages**: Automatically parsed from message content
2. **GA Protocol**: Random tracking IDs (GA-12345678) generated by landing page scripts

**Landing Page Integration Pattern**:
```javascript
// Generate unique tracking ID
const trackingId = `GA-${Math.floor(Math.random() * 100000000)}`;

// Include in WhatsApp message
const message = `Olá! ${trackingId} Gostaria de agendar consulta`;
const whatsappUrl = `https://wa.me/5511999999999?text=${encodeURIComponent(message)}`;
```

**Webhook Endpoints**:
- **Evolution API**: `/api/webhooks/evolution` (processes all WhatsApp events, includes marketing detection)
- **Google UTM**: `/api/webhooks/google-utm` (manual UTM data submission)

**Marketing Dashboard** (`/dashboard/relatorios`):
- Lead funnel visualization by source
- Conversion rates and performance metrics
- Campaign effectiveness analysis
- Setup instructions for Meta Ads and Google Ads

**Service Layer Pattern**:
```typescript
// Automatic processing from Evolution webhook
await MarketingService.processEvolutionMessage(
  clinicId, phone, conversationId, webhookData, messageContent, supabase
)

// Manual lead creation via webhook
await MarketingService.createLeadFromMessage(
  clinicId, phone, conversationId, 'google', null, utmData, supabase
)
```

**Lead Status Progression**:
```
new → contacted → qualified → appointment → converted → lost
```

Each status change triggers automatic conversion event creation for analytics and reporting.

### 24. New Conversation Creation with Patients
The chat system includes functionality to start new conversations with registered patients.

**Component**: `NewConversationDialog` allows searching and selecting patients by:
- **Name**: Full text search
- **Phone**: Exact match search  
- **CPF**: Brazilian document search

**Integration Pattern**:
```typescript
// Button in ConversationList
<Button onClick={() => setNewConversationOpen(true)}>
  <Plus className="h-4 w-4" />
  Nova Conversa
</Button>

// Dialog handles patient selection and conversation creation
<NewConversationDialog
  open={newConversationOpen}
  onConversationCreated={(conversation) => {
    setConversations(prev => [conversation, ...prev])
    setSelectedConversation(conversation)
  }}
/>
```

**Backend Logic**:
- Searches `patients` table filtered by clinic
- Creates new conversation or reuses existing one for same phone
- Automatically links to patient record
- Returns `ConversationWithPatient` object for immediate UI update

**File Locations**:
- Component: `/src/features/chat/components/new-conversation-dialog.tsx`
- Integration: `/src/app/(dashboard)/dashboard/chat/client.tsx`
- Service: Uses `ChatService.findOrCreateConversation()`