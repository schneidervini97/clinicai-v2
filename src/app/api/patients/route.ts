import { NextRequest, NextResponse } from 'next/server'
import { PatientService } from '@/features/patients/services/patient.service'
import { patientSchema, patientFiltersSchema, paginationSchema } from '@/features/patients/types/patient.schema'
import { Patient, PaginationParams } from '@/features/patients/types/patient.types'
import { createClient } from '@/lib/supabase/server'

interface ZodError extends Error {
  errors: Array<{ path: (string | number)[]; message: string }>
}

// GET /api/patients - List patients with filters and pagination
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    // Parse pagination parameters
    const paginationParams = {
      page: parseInt(searchParams.get('page') || '1'),
      per_page: parseInt(searchParams.get('per_page') || '20'),
      sort_by: (searchParams.get('sort_by') || 'created_at') as keyof Patient,
      sort_order: (searchParams.get('sort_order') || 'desc') as 'asc' | 'desc',
    }

    // Parse filter parameters
    const filters: Record<string, unknown> = {}
    
    if (searchParams.get('search')) {
      filters.search = searchParams.get('search')
    }
    
    if (searchParams.get('status')) {
      filters.status = searchParams.get('status')!.split(',')
    }
    
    if (searchParams.get('media_origin')) {
      filters.media_origin = searchParams.get('media_origin')!.split(',')
    }
    
    if (searchParams.get('gender')) {
      filters.gender = searchParams.get('gender')!.split(',')
    }
    
    if (searchParams.get('tags')) {
      filters.tags = searchParams.get('tags')!.split(',')
    }
    
    if (searchParams.get('has_health_insurance')) {
      filters.has_health_insurance = searchParams.get('has_health_insurance') === 'true'
    }
    
    if (searchParams.get('age_min')) {
      filters.age_min = parseInt(searchParams.get('age_min')!)
    }
    
    if (searchParams.get('age_max')) {
      filters.age_max = parseInt(searchParams.get('age_max')!)
    }
    
    if (searchParams.get('created_after')) {
      filters.created_after = searchParams.get('created_after')
    }
    
    if (searchParams.get('created_before')) {
      filters.created_before = searchParams.get('created_before')
    }
    
    if (searchParams.get('birthday_month')) {
      filters.birthday_month = parseInt(searchParams.get('birthday_month')!)
    }

    // Validate parameters
    const validatedPagination = paginationSchema.parse(paginationParams)
    const validatedFilters = patientFiltersSchema.parse(filters)

    // Get patients
    const result = await PatientService.search(validatedFilters, validatedPagination as PaginationParams)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching patients:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/patients - Create new patient
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validate input
    const validatedData = patientSchema.parse(body)

    // Check for duplicates
    if (validatedData.cpf) {
      const existingByCpf = await PatientService.findByCpf(validatedData.cpf)
      if (existingByCpf) {
        return NextResponse.json(
          { error: 'Já existe um paciente com este CPF' },
          { status: 400 }
        )
      }
    }

    if (validatedData.email) {
      const existingByEmail = await PatientService.findByEmail(validatedData.email)
      if (existingByEmail) {
        return NextResponse.json(
          { error: 'Já existe um paciente com este email' },
          { status: 400 }
        )
      }
    }

    // Create patient
    const patient = await PatientService.create(validatedData)

    return NextResponse.json(patient, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating patient:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Dados inválidos', details: (error as ZodError).errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}