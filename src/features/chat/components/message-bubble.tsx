// Message bubble component for chat messages
// Displays individual messages with different types and status indicators

'use client'

import { useState } from 'react'
import { Message } from '../types/chat.types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Download, 
  FileText, 
  Image, 
  MapPin, 
  Music, 
  Play, 
  User, 
  Video,
  Check,
  CheckCheck,
  Clock,
  Mic,
  Loader2,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  formatFileSize, 
  formatDuration, 
  getAspectRatio, 
  getFileTypeIcon,
  isValidThumbnail,
  parseWaveform,
  getMediaTypeDisplayName
} from '../utils/media.utils'

interface MessageBubbleProps {
  message: Message
  showAvatar?: boolean
}

export function MessageBubble({ message, showAvatar = false }: MessageBubbleProps) {
  const isOutbound = message.direction === 'outbound'

  return (
    <div
      className={cn(
        'flex gap-2 max-w-[80%] mb-3',
        isOutbound ? 'ml-auto flex-row-reverse' : 'mr-auto'
      )}
    >
      {/* Avatar placeholder for inbound messages */}
      {showAvatar && !isOutbound && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-4 w-4 text-primary" />
        </div>
      )}

      {/* Message bubble */}
      <div
        className={cn(
          'rounded-2xl px-3 py-2 break-words',
          isOutbound
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted text-foreground rounded-bl-sm'
        )}
      >
        {/* Message content based on type */}
        <MessageContent message={message} />

        {/* Message timestamp and status */}
        <div
          className={cn(
            'flex items-center justify-end gap-1 mt-1 text-xs opacity-70',
            isOutbound ? 'text-primary-foreground' : 'text-muted-foreground'
          )}
        >
          <span>
            {new Date(message.created_at).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>

          {/* Status indicators for outbound messages */}
          {isOutbound && <MessageStatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  )
}

function MessageContent({ message }: { message: Message }) {
  switch (message.message_type) {
    case 'text':
      return (
        <div className="whitespace-pre-wrap">
          {message.content}
        </div>
      )

    case 'image':
      return <ImageMessage message={message} />

    case 'video':
      return <VideoMessage message={message} />

    case 'audio':
      return <AudioMessage message={message} />

    case 'document':
      return (
        <div className="flex items-center gap-3 p-2 border rounded-lg min-w-48">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">
              {message.content || 'Documento'}
            </div>
            {message.media_caption && (
              <div className="text-xs text-muted-foreground truncate">
                {message.media_caption}
              </div>
            )}
          </div>
          {message.media_url && (
            <Button
              size="sm"
              variant="ghost"
              className="flex-shrink-0 h-8 w-8 p-0"
              onClick={() => window.open(message.media_url, '_blank')}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      )

    case 'sticker':
      return (
        <div className="flex items-center justify-center">
          {message.media_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={message.media_url}
              alt="Sticker"
              className="w-24 h-24 object-contain"
              loading="lazy"
            />
          ) : (
            <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center">
              <span className="text-2xl">😀</span>
            </div>
          )}
        </div>
      )

    case 'location':
      return (
        <div className="flex items-center gap-3 p-3 border rounded-lg min-w-48">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm">
              📍 Localização
            </div>
            {message.content && message.content !== '📍 Localização' && (
              <div className="text-xs text-muted-foreground">
                {message.content.replace('📍 ', '')}
              </div>
            )}
          </div>
        </div>
      )

    case 'contact':
      return (
        <div className="flex items-center gap-3 p-3 border rounded-lg min-w-48">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm">
              {message.content || 'Contato'}
            </div>
            <div className="text-xs text-muted-foreground">
              Contato compartilhado
            </div>
          </div>
        </div>
      )

    default:
      return (
        <div className="flex items-center gap-2 p-2 border rounded-lg">
          <Badge variant="secondary" className="text-xs">
            {message.message_type}
          </Badge>
          <span className="text-sm">
            {message.content || 'Mensagem não suportada'}
          </span>
        </div>
      )
  }
}

function MessageStatusIcon({ status }: { status: Message['status'] }) {
  switch (status) {
    case 'sent':
      return <Check className="h-3 w-3" />
    case 'delivered':
      return <CheckCheck className="h-3 w-3" />
    case 'read':
      return <CheckCheck className="h-3 w-3 text-blue-500" />
    case 'failed':
      return <Clock className="h-3 w-3 text-red-500" />
    default:
      return <Clock className="h-3 w-3" />
  }
}

function ImageMessage({ message }: { message: Message }) {
  const [showFullImage, setShowFullImage] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  
  // Determine the best image source to use
  const getImageSource = () => {
    // 1st priority: base64 data (if processing is completed)
    if (message.media_base64) {
      return message.media_base64
    }
    // 2nd priority: external URL (if available)
    if (message.media_url && message.media_url.startsWith('http')) {
      return message.media_url
    }
    // 3rd priority: thumbnail as fallback
    if (isValidThumbnail(message.media_thumbnail)) {
      return `data:image/jpeg;base64,${message.media_thumbnail}`
    }
    return null
  }

  const imageSource = getImageSource()
  const hasFullImage = message.media_base64 || (message.media_url && message.media_url.startsWith('http'))
  
  return (
    <div className="space-y-2">
      {imageSource && (
        <div 
          className="relative rounded-lg overflow-hidden max-w-xs cursor-pointer"
          style={{ 
            aspectRatio: getAspectRatio(message.media_width, message.media_height) || '1'
          }}
          onClick={() => setShowFullImage(true)}
        >
          {/* Show thumbnail with blur while full image loads */}
          {!hasFullImage && isValidThumbnail(message.media_thumbnail) && (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/jpeg;base64,${message.media_thumbnail}`}
                alt="Carregando imagem..."
                className="w-full h-auto blur-sm"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="bg-white/80 rounded-full p-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                </div>
              </div>
            </div>
          )}
          
          {/* Full image (base64 or URL) */}
          {hasFullImage && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSource}
                alt="Imagem"
                className={cn(
                  "w-full h-auto transition-opacity duration-300",
                  imageLoaded ? "opacity-100" : "opacity-0"
                )}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
              />
              
              {/* Download/expand button */}
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation()
                  if (message.media_base64) {
                    // Download base64 image
                    const link = document.createElement('a')
                    link.href = message.media_base64
                    link.download = `imagem-${new Date().getTime()}.jpg`
                    link.click()
                  } else if (message.media_url) {
                    window.open(message.media_url, '_blank')
                  }
                }}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      )}
      
      {/* File size and caption */}
      <div className="space-y-1">
        {message.media_size && (
          <div className="text-xs opacity-70">
            {formatFileSize(message.media_size)}
          </div>
        )}
        {message.media_caption && (
          <div className="text-sm">
            {message.media_caption}
          </div>
        )}
      </div>
      
      {/* Simple modal overlay for full image */}
      {showFullImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowFullImage(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={message.media_url}
            alt="Imagem completa"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

function VideoMessage({ message }: { message: Message }) {
  const [showVideo, setShowVideo] = useState(false)
  
  // Determine video source (base64 or URL)
  const getVideoSource = () => {
    if (message.media_base64) {
      return message.media_base64
    }
    if (message.media_url && message.media_url.startsWith('http')) {
      return message.media_url
    }
    return null
  }

  const videoSource = getVideoSource()
  const hasVideo = !!videoSource
  
  return (
    <div className="space-y-2">
      <div 
        className="relative rounded-lg overflow-hidden max-w-xs cursor-pointer bg-black"
        style={{ 
          aspectRatio: getAspectRatio(message.media_width, message.media_height) || '16/9'
        }}
        onClick={() => hasVideo && setShowVideo(true)}
      >
        {/* Video thumbnail */}
        {isValidThumbnail(message.media_thumbnail) ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/jpeg;base64,${message.media_thumbnail}`}
              alt="Video thumbnail"
              className="w-full h-auto"
            />
            
            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                hasVideo ? "bg-white/90 hover:bg-white" : "bg-gray-400/70"
              )}>
                {hasVideo ? (
                  <Play className="h-6 w-6 text-black ml-1" />
                ) : (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                )}
              </div>
            </div>
            
            {/* Processing indicator */}
            {!hasVideo && (
              <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                Processando...
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-32 bg-gray-800 flex items-center justify-center">
            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
              {hasVideo ? (
                <Play className="h-6 w-6 text-black ml-1" />
              ) : (
                <Loader2 className="h-6 w-6 text-black animate-spin" />
              )}
            </div>
          </div>
        )}
        
        {/* Duration badge */}
        {message.media_duration && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {formatDuration(message.media_duration)}
          </div>
        )}
      </div>
      
      {/* File size and caption */}
      <div className="space-y-1">
        {message.media_size && (
          <div className="text-xs opacity-70">
            {formatFileSize(message.media_size)}
          </div>
        )}
        {message.media_caption && (
          <div className="text-sm">
            {message.media_caption}
          </div>
        )}
      </div>
      
      {/* Video modal */}
      {showVideo && videoSource && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowVideo(false)}
        >
          <div className="relative max-w-4xl max-h-full">
            <video
              controls
              autoPlay
              className="w-full h-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <source src={videoSource} type={message.media_mime_type || "video/mp4"} />
              Seu navegador não suporta vídeos.
            </video>
          </div>
        </div>
      )}
    </div>
  )
}

function AudioMessage({ message }: { message: Message }) {
  const waveformData = parseWaveform(message.media_waveform)
  
  // Determine audio source (base64 or URL)
  const getAudioSource = () => {
    if (message.media_base64) {
      return message.media_base64
    }
    if (message.media_url && message.media_url.startsWith('http')) {
      return message.media_url
    }
    return null
  }

  const audioSource = getAudioSource()
  const hasAudio = !!audioSource
  
  return (
    <div className="flex items-center gap-3 min-w-64">
      {/* Audio icon */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
        {hasAudio ? (
          message.is_voice_note ? (
            <Mic className="h-5 w-5 text-primary" />
          ) : (
            <Music className="h-5 w-5 text-primary" />
          )
        ) : (
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
        )}
      </div>
      
      {/* Audio player */}
      <div className="flex-1 space-y-2">
        {/* Waveform visualization (optional) */}
        {waveformData.length > 0 && (
          <div className="flex items-center gap-0.5 h-8">
            {waveformData.slice(0, 40).map((value, i) => (
              <div 
                key={i}
                className={cn(
                  "w-1 rounded-full min-h-[2px]",
                  hasAudio ? "bg-current opacity-70" : "bg-gray-300 opacity-50"
                )}
                style={{ height: `${Math.max(2, (value / 255) * 32)}px` }}
              />
            ))}
          </div>
        )}
        
        {/* Audio controls */}
        {hasAudio ? (
          <audio controls className="w-full h-8">
            <source src={audioSource} type={message.media_mime_type || "audio/ogg"} />
            <source src={audioSource} type="audio/mpeg" />
            Seu navegador não suporta áudios.
          </audio>
        ) : (
          <div className="w-full h-8 bg-gray-100 rounded flex items-center justify-center">
            <span className="text-xs text-gray-500">Processando áudio...</span>
          </div>
        )}
        
        {/* Duration and file size */}
        <div className="flex items-center justify-between text-xs opacity-70">
          <span>
            {getMediaTypeDisplayName('audio', message.is_voice_note)}
            {message.media_duration && ` • ${formatDuration(message.media_duration)}`}
            {!hasAudio && ' • Carregando...'}
          </span>
          {message.media_size && (
            <span>{formatFileSize(message.media_size)}</span>
          )}
        </div>
      </div>
    </div>
  )
}