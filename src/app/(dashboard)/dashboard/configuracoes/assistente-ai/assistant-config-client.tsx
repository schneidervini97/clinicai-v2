'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bot, Clock, Upload, ArrowLeft, Save, FileText, X, Calendar } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface WorkingHours {
  enabled: boolean
  startTime: string
  endTime: string
}

interface AssistantConfig {
  name: string
  enabled: boolean
  workingDays: {
    monday: boolean
    tuesday: boolean
    wednesday: boolean
    thursday: boolean
    friday: boolean
    saturday: boolean
    sunday: boolean
  }
  workingHours: {
    monday: WorkingHours
    tuesday: WorkingHours
    wednesday: WorkingHours
    thursday: WorkingHours
    friday: WorkingHours
    saturday: WorkingHours
    sunday: WorkingHours
  }
  knowledgeBase: Array<{
    id: string
    name: string
    size: string
    uploadedAt: string
  }>
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Segunda-feira' },
  { key: 'tuesday', label: 'Terça-feira' },
  { key: 'wednesday', label: 'Quarta-feira' },
  { key: 'thursday', label: 'Quinta-feira' },
  { key: 'friday', label: 'Sexta-feira' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' }
] as const

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2)
  const minute = i % 2 === 0 ? '00' : '30'
  return `${hour.toString().padStart(2, '0')}:${minute}`
})

export function AssistantConfigClient() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  
  const [config, setConfig] = useState<AssistantConfig>({
    name: 'Assistente Virtual',
    enabled: false,
    workingDays: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false
    },
    workingHours: {
      monday: { enabled: true, startTime: '08:00', endTime: '18:00' },
      tuesday: { enabled: true, startTime: '08:00', endTime: '18:00' },
      wednesday: { enabled: true, startTime: '08:00', endTime: '18:00' },
      thursday: { enabled: true, startTime: '08:00', endTime: '18:00' },
      friday: { enabled: true, startTime: '08:00', endTime: '18:00' },
      saturday: { enabled: false, startTime: '08:00', endTime: '12:00' },
      sunday: { enabled: false, startTime: '08:00', endTime: '12:00' }
    },
    knowledgeBase: []
  })

  const handleSave = async () => {
    setIsSubmitting(true)
    
    try {
      // Simulate save - in production, this would save to database
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success('Configurações do assistente salvas com sucesso!')
      router.refresh()
    } catch (error) {
      console.error('Error saving assistant config:', error)
      toast.error('Erro ao salvar configurações')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setUploadingFile(true)
    
    try {
      // Simulate file upload - in production, this would upload to storage
      const file = files[0]
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const newFile = {
        id: Date.now().toString(),
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        uploadedAt: new Date().toLocaleString('pt-BR')
      }
      
      setConfig(prev => ({
        ...prev,
        knowledgeBase: [...prev.knowledgeBase, newFile]
      }))
      
      toast.success(`Arquivo "${file.name}" adicionado à base de conhecimento`)
    } catch (error) {
      console.error('Error uploading file:', error)
      toast.error('Erro ao fazer upload do arquivo')
    } finally {
      setUploadingFile(false)
      // Reset input
      event.target.value = ''
    }
  }

  const removeFile = (fileId: string) => {
    setConfig(prev => ({
      ...prev,
      knowledgeBase: prev.knowledgeBase.filter(f => f.id !== fileId)
    }))
    toast.success('Arquivo removido da base de conhecimento')
  }

  const toggleDay = (day: keyof AssistantConfig['workingDays']) => {
    setConfig(prev => ({
      ...prev,
      workingDays: {
        ...prev.workingDays,
        [day]: !prev.workingDays[day]
      },
      workingHours: {
        ...prev.workingHours,
        [day]: {
          ...prev.workingHours[day],
          enabled: !prev.workingDays[day]
        }
      }
    }))
  }

  const updateWorkingHours = (
    day: keyof AssistantConfig['workingHours'],
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    setConfig(prev => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [day]: {
          ...prev.workingHours[day],
          [field]: value
        }
      }
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="p-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bot className="h-8 w-8" />
            Assistente AI
          </h1>
          <p className="text-muted-foreground">
            Configure o assistente inteligente para atendimento automatizado
          </p>
        </div>
        {config.enabled && (
          <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            Ativo
          </div>
        )}
      </div>

      {/* Basic Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Configurações Básicas
          </CardTitle>
          <CardDescription>
            Configure o nome e status do assistente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="assistant-name">Nome do Assistente</Label>
            <Input
              id="assistant-name"
              placeholder="Ex: Assistente Virtual"
              value={config.name}
              onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
            />
            <p className="text-sm text-muted-foreground">
              Este nome será usado nas conversas com os pacientes
            </p>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="assistant-enabled" className="text-base">
                Ativar Assistente
              </Label>
              <p className="text-sm text-muted-foreground">
                Quando ativo, o assistente responderá automaticamente às mensagens
              </p>
            </div>
            <Switch
              id="assistant-enabled"
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Working Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Horários de Funcionamento
          </CardTitle>
          <CardDescription>
            Defina quando o assistente deve estar ativo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {DAYS_OF_WEEK.map(({ key, label }) => (
              <div key={key} className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id={`day-${key}`}
                    checked={config.workingDays[key]}
                    onCheckedChange={() => toggleDay(key)}
                  />
                  <Label
                    htmlFor={`day-${key}`}
                    className="flex-1 text-sm font-medium cursor-pointer"
                  >
                    {label}
                  </Label>
                  
                  {config.workingDays[key] && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Select
                        value={config.workingHours[key].startTime}
                        onValueChange={(value) => updateWorkingHours(key, 'startTime', value)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map(time => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">até</span>
                      <Select
                        value={config.workingHours[key].endTime}
                        onValueChange={(value) => updateWorkingHours(key, 'endTime', value)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map(time => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Knowledge Base */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Base de Conhecimento
          </CardTitle>
          <CardDescription>
            Faça upload de documentos para o assistente usar como referência durante o atendimento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Button */}
          <div className="flex items-center gap-4">
            <input
              type="file"
              id="knowledge-upload"
              className="hidden"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileUpload}
              disabled={uploadingFile}
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('knowledge-upload')?.click()}
              disabled={uploadingFile}
            >
              {uploadingFile ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Adicionar Documento
                </>
              )}
            </Button>
            <span className="text-sm text-muted-foreground">
              Formatos aceitos: PDF, DOC, DOCX, TXT
            </span>
          </div>

          {/* File List */}
          {config.knowledgeBase.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Documentos na base ({config.knowledgeBase.length})
              </p>
              <div className="space-y-2">
                {config.knowledgeBase.map(file => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.size} • Enviado em {file.uploadedAt}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhum documento na base de conhecimento
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Adicione documentos para o assistente usar como referência
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Buttons */}
      <div className="flex justify-end space-x-4 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
    </div>
  )
}