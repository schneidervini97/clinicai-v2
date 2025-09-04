import React from 'react'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { PipelineService } from '@/features/pipeline/services/pipeline.service'
import { PipelinePageClient } from './pipeline-client'

export default async function PipelinePage() {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  try {
    // Fetch pipeline data
    const boardData = await PipelineService.getPipelineBoardData(supabase)
    
    console.log('PipelinePage - boardData loaded:', {
      totalPatients: Object.values(boardData).reduce((sum, patients) => sum + patients.length, 0),
      stageBreakdown: Object.entries(boardData).map(([stage, patients]) => ({ stage, count: patients.length }))
    })

    return (
      <PipelinePageClient 
        initialBoardData={boardData}
      />
    )
  } catch (error) {
    console.error('Error loading pipeline data:', error)
    
    // Fallback with empty data
    return (
      <PipelinePageClient 
        initialBoardData={{
          LEAD: [],
          CONTATO_INICIAL: [],
          AGENDAMENTO: [],
          COMPARECIMENTO: [],
          FECHAMENTO: [],
          DESISTENCIA: []
        }}
      />
    )
  }
}