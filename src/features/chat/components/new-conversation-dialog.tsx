// Dialog component for starting new conversations with registered patients
// Allows searching and selecting patients to start new WhatsApp conversations

'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, User, Phone } from 'lucide-react'
import { PatientService } from '@/features/patients/services/patient.service'
import { ChatService } from '@/features/chat/services/chat.service'
import { Patient } from '@/features/patients/types/patient.types'
import { ConversationWithPatient } from '../types/chat.types'

interface NewConversationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clinicId: string
  onConversationCreated: (conversation: ConversationWithPatient) => void
}

export function NewConversationDialog({
  open,
  onOpenChange,
  clinicId,
  onConversationCreated
}: NewConversationDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  // Load patients when dialog opens
  useEffect(() => {
    if (open) {
      loadPatients()
    }
  }, [open])

  // Load patients when dialog opens
  const loadPatients = async () => {
    if (!open) return
    
    setLoading(true)
    setError(null)
    
    try {
      const result = await PatientService.search(
        {
          status: ['active', 'inactive'] // Include active and inactive, exclude only archived
        },
        {
          page: 1,
          per_page: 100
        },
        supabase
      )
      
      setPatients(result.data)
    } catch (err) {
      console.error('❌ Error loading patients:', err)
      setError('Erro ao carregar pacientes')
    } finally {
      setLoading(false)
    }
  }

  // Filter patients based on search
  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients

    const query = searchQuery.toLowerCase().trim()
    return patients.filter(patient =>
      patient.name.toLowerCase().includes(query) ||
      patient.phone.includes(query) ||
      patient.cpf?.includes(query)
    )
  }, [patients, searchQuery])

  // Handle dialog close
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
    
    if (!newOpen) {
      // Reset form when closing
      setSearchQuery('')
      setSelectedPatientId('')
      setError(null)
    }
  }

  // Create or get existing conversation
  const handleCreateConversation = async () => {
    if (!selectedPatientId) return

    const selectedPatient = patients.find(p => p.id === selectedPatientId)
    if (!selectedPatient) return

    setCreating(true)
    setError(null)

    try {
      // Check if conversation already exists
      const existingConversations = await ChatService.getConversations(
        clinicId,
        { patient_phone: selectedPatient.phone },
        supabase
      )

      let conversation: ConversationWithPatient

      if (existingConversations.length > 0) {
        // Use existing conversation
        conversation = existingConversations[0]
      } else {
        // Create new conversation
        const newConversation = await ChatService.findOrCreateConversation(
          clinicId,
          selectedPatient.phone,
          selectedPatient.name,
          supabase
        )

        // Convert to ConversationWithPatient format
        conversation = {
          ...newConversation,
          patient: {
            id: selectedPatient.id,
            name: selectedPatient.name,
            phone: selectedPatient.phone,
            email: selectedPatient.email || undefined
          }
        }
      }

      // Callback with created/found conversation
      onConversationCreated(conversation)
      
      // Close dialog
      handleOpenChange(false)

    } catch (err) {
      console.error('Error creating conversation:', err)
      setError('Erro ao criar conversa. Tente novamente.')
    } finally {
      setCreating(false)
    }
  }

  const selectedPatient = patients.find(p => p.id === selectedPatientId)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Nova Conversa
          </DialogTitle>
          <DialogDescription>
            Selecione um paciente para iniciar uma nova conversa no WhatsApp
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou CPF..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              disabled={loading}
            />
          </div>

          {/* Patient list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Pacientes {filteredPatients.length > 0 && `(${filteredPatients.length})`}
              </label>
              {loading && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            
            <div className="border rounded-lg max-h-60 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    Carregando pacientes...
                  </span>
                </div>
              ) : filteredPatients.length > 0 ? (
                <div className="divide-y">
                  {filteredPatients.map((patient) => (
                    <div
                      key={patient.id}
                      onClick={() => setSelectedPatientId(patient.id)}
                      className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedPatientId === patient.id
                          ? 'bg-primary/10 border-l-4 border-l-primary'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{patient.name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            {patient.phone}
                            {patient.status === 'inactive' && (
                              <Badge variant="outline" className="text-xs">
                                Inativo
                              </Badge>
                            )}
                            {patient.status === 'archived' && (
                              <Badge variant="secondary" className="text-xs">
                                Arquivado
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery.trim() 
                      ? 'Nenhum paciente encontrado com essa busca' 
                      : 'Nenhum paciente cadastrado'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Selected patient preview */}
          {selectedPatient && (
            <div className="border rounded-lg p-3 bg-muted/20">
              <div className="flex items-center gap-3">
                <User className="h-8 w-8 text-primary bg-primary/10 rounded-full p-2" />
                <div className="flex-1">
                  <div className="font-medium">{selectedPatient.name}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Phone className="h-3 w-3" />
                    {selectedPatient.phone}
                  </div>
                  {selectedPatient.email && (
                    <div className="text-xs text-muted-foreground">
                      {selectedPatient.email}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateConversation}
              disabled={!selectedPatientId || creating}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Criando...
                </>
              ) : (
                'Iniciar Conversa'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}