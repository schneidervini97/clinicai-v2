// Message input component for sending messages
// Handles text input, file uploads, and message sending

'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { 
  Send, 
  Paperclip, 
  Image, 
  FileText, 
  Smile
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageInputProps {
  onSendMessage: (content: string, type: 'text') => Promise<void>
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function MessageInput({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Digite sua mensagem...",
  className 
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = async () => {
    if (!message.trim() || sending || disabled) return

    setSending(true)
    try {
      await onSendMessage(message.trim(), 'text')
      setMessage('')
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target
    setMessage(textarea.value)

    // Auto-resize textarea
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // TODO: Implement file upload logic
      console.log('File selected:', file)
    }
  }

  return (
    <div className={cn("border-t bg-background p-4", className)}>
      {/* File input (hidden) */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.txt"
        onChange={handleFileChange}
      />

      <div className="flex items-end gap-2">
        {/* Attachment button */}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="flex-shrink-0"
          onClick={handleFileSelect}
          disabled={disabled || sending}
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        {/* Message input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || sending}
            className="min-h-[44px] max-h-[120px] resize-none pr-12 py-3"
            rows={1}
          />

          {/* Emoji button (future implementation) */}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
            disabled={disabled || sending}
            onClick={() => {
              // TODO: Implement emoji picker
            }}
          >
            <Smile className="h-4 w-4" />
          </Button>
        </div>

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={!message.trim() || disabled || sending}
          className="flex-shrink-0"
          size="icon"
        >
          {sending ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Quick actions row (future implementation) */}
      <div className="flex items-center gap-1 mt-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-xs"
          disabled={disabled || sending}
          onClick={() => setMessage('Olá! Como posso ajudá-lo(a)?')}
        >
          Saudação
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-xs"
          disabled={disabled || sending}
          onClick={() => setMessage('Obrigado pelo contato. Em breve retornamos.')}
        >
          Agradecimento
        </Button>
      </div>
    </div>
  )
}