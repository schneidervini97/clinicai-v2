'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Check, ChevronsUpDown, User, Plus } from 'lucide-react'
import { debounce } from 'lodash'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

import { PatientService } from '@/features/patients/services/patient.service'
import { Patient } from '@/features/patients/types/patient.types'
import { createClient } from '@/lib/supabase/client'

interface PatientSearchProps {
  value?: string
  onSelect: (patient: Patient | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  onCreateNew?: () => void
}

export function PatientSearch({
  value,
  onSelect,
  placeholder = 'Buscar paciente...',
  disabled = false,
  className,
  onCreateNew
}: PatientSearchProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)

  const supabase = useMemo(() => createClient(), [])

  // Search function
  const searchPatients = useCallback(async (query: string) => {
    if (query.length < 2) {
      setPatients([])
      return
    }

    setLoading(true)
    try {
      const result = await PatientService.search(
        { search: query },
        { per_page: 20, sort_by: 'name', sort_order: 'asc' },
        supabase
      )
      setPatients(result.data)
    } catch (error) {
      console.error('Error searching patients:', error)
      setPatients([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Load recent patients function
  const loadRecentPatients = useCallback(async () => {
    setLoading(true)
    try {
      const result = await PatientService.search(
        {},
        { per_page: 10, sort_by: 'updated_at', sort_order: 'desc' },
        supabase
      )
      setPatients(result.data)
    } catch (error) {
      console.error('Error loading recent patients:', error)
      setPatients([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Load selected patient function
  const loadSelectedPatient = useCallback(async (patientId: string) => {
    try {
      const patient = await PatientService.findById(patientId, supabase)
      setSelectedPatient(patient)
    } catch (error) {
      console.error('Error loading selected patient:', error)
      setSelectedPatient(null)
    }
  }, [supabase])

  // Debounced search function
  const debouncedSearch = useMemo(
    () => debounce(searchPatients, 300),
    [searchPatients]
  )

  // Load recent patients when popover opens
  useEffect(() => {
    if (open && patients.length === 0 && !searchQuery) {
      loadRecentPatients()
    }
  }, [open, patients.length, searchQuery, loadRecentPatients])

  // Load selected patient if value is provided
  useEffect(() => {
    if (value && value !== selectedPatient?.id) {
      loadSelectedPatient(value)
    } else if (!value && selectedPatient) {
      setSelectedPatient(null)
    }
  }, [value, selectedPatient?.id, loadSelectedPatient, selectedPatient])

  // Trigger search when query changes
  useEffect(() => {
    debouncedSearch(searchQuery)
    return () => {
      debouncedSearch.cancel()
    }
  }, [searchQuery, debouncedSearch])

  const handleSelect = (patient: Patient) => {
    setSelectedPatient(patient)
    setOpen(false)
    setSearchQuery('')
    onSelect(patient)
  }

  const handleClear = () => {
    setSelectedPatient(null)
    setSearchQuery('')
    onSelect(null)
  }

  const formatPatientDisplay = (patient: Patient) => {
    const parts = [patient.name]
    if (patient.phone) parts.push(patient.phone)
    if (patient.email) parts.push(patient.email)
    return parts.join(' • ')
  }

  const formatPatientInfo = (patient: Patient) => {
    const info = []
    if (patient.phone) info.push(`📞 ${patient.phone}`)
    if (patient.email) info.push(`✉️ ${patient.email}`)
    return info.join(' • ')
  }

  const getPatientInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-[2.5rem] text-left"
            disabled={disabled}
          >
            {selectedPatient ? (
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-primary">
                    {getPatientInitials(selectedPatient.name)}
                  </span>
                </div>
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <span className="font-medium truncate">
                    {selectedPatient.name}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {formatPatientInfo(selectedPatient)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{placeholder}</span>
              </div>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Digite o nome, telefone ou email..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {loading ? (
                <CommandGroup>
                  <div className="p-2 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </CommandGroup>
              ) : (
                <>
                  {patients.length === 0 && searchQuery.length >= 2 && (
                    <CommandEmpty>
                      <div className="text-center py-6 space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Nenhum paciente encontrado
                        </p>
                        {onCreateNew && (
                          <>
                            <Separator className="my-2" />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary"
                              onClick={() => {
                                setOpen(false)
                                onCreateNew()
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Cadastrar novo paciente
                            </Button>
                          </>
                        )}
                      </div>
                    </CommandEmpty>
                  )}

                  {patients.length > 0 && (
                    <CommandGroup>
                      {selectedPatient && (
                        <CommandItem onSelect={handleClear} className="text-muted-foreground">
                          <Check className="mr-2 h-4 w-4 opacity-0" />
                          Limpar seleção
                        </CommandItem>
                      )}
                      
                      {patients.map((patient) => (
                        <CommandItem
                          key={patient.id}
                          onSelect={() => handleSelect(patient)}
                          className="flex items-center gap-3 p-3"
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              selectedPatient?.id === patient.id
                                ? "opacity-100"
                                : "opacity-0"
                            }`}
                          />
                          <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {getPatientInitials(patient.name)}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <span className="font-medium truncate">
                              {patient.name}
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {patient.phone && (
                                <Badge variant="outline" className="text-xs">
                                  {patient.phone}
                                </Badge>
                              )}
                              {patient.email && (
                                <Badge variant="outline" className="text-xs">
                                  {patient.email}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {onCreateNew && searchQuery.length >= 2 && (
                    <>
                      <Separator />
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => {
                            setOpen(false)
                            onCreateNew()
                          }}
                          className="text-primary"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Cadastrar novo paciente
                        </CommandItem>
                      </CommandGroup>
                    </>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}