import { NextRequest, NextResponse } from 'next/server'
import { PatientService } from '@/features/patients/services/patient.service'
import { patientUpdateSchema } from '@/features/patients/types/patient.schema'
import { createClient } from '@/lib/supabase/server'

interface ZodError extends Error {
  errors: Array<{ path: (string | number)[]; message: string }>
}

// GET /api/patients/[id] - Get patient by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params
    const patient = await PatientService.findById(id, supabase)

    if (!patient) {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(patient)
  } catch (error: unknown) {
    console.error('Error fetching patient:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/patients/[id] - Update patient
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    
    // Validate input with ID
    const validatedData = patientUpdateSchema.parse({
      ...body,
      id
    })

    // Check if patient exists
    const existingPatient = await PatientService.findById(id, supabase)
    if (!existingPatient) {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      )
    }

    // Check for duplicates (excluding current patient)
    if (validatedData.cpf && validatedData.cpf !== existingPatient.cpf) {
      const cpfExists = await PatientService.checkCpfExists(validatedData.cpf, id)
      if (cpfExists) {
        return NextResponse.json(
          { error: 'Já existe um paciente com este CPF' },
          { status: 400 }
        )
      }
    }

    if (validatedData.email && validatedData.email !== existingPatient.email) {
      const emailExists = await PatientService.checkEmailExists(validatedData.email, id)
      if (emailExists) {
        return NextResponse.json(
          { error: 'Já existe um paciente com este email' },
          { status: 400 }
        )
      }
    }

    // Update patient (remove id from update data)
    const { id: _patientId, ...updateData } = validatedData
    const patient = await PatientService.update(id, updateData)

    return NextResponse.json(patient)
  } catch (error: unknown) {
    console.error('Error updating patient:', error)
    
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

// DELETE /api/patients/[id] - Delete patient
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Check if patient exists
    const existingPatient = await PatientService.findById(id, supabase)
    if (!existingPatient) {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      )
    }

    // Parse query parameters for soft delete
    const { searchParams } = new URL(request.url)
    const softDelete = searchParams.get('soft') === 'true'

    if (softDelete) {
      // Archive instead of delete
      const patient = await PatientService.archive(id)
      return NextResponse.json({
        message: 'Paciente arquivado com sucesso',
        patient
      })
    } else {
      // Hard delete
      await PatientService.delete(id)
      return NextResponse.json({
        message: 'Paciente excluído com sucesso'
      })
    }
  } catch (error: unknown) {
    console.error('Error deleting patient:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}