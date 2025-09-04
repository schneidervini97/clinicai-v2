// Utility functions for media handling in chat
// Formatting, validation and helper functions

/**
 * Format file size from bytes to human readable string
 */
export function formatFileSize(bytes: number | undefined): string {
  if (!bytes || bytes === 0) return '0 B'
  
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

/**
 * Format duration from seconds to MM:SS format
 */
export function formatDuration(seconds: number | undefined): string {
  if (!seconds || seconds === 0) return '0:00'
  
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Get aspect ratio string for CSS
 */
export function getAspectRatio(width: number | undefined, height: number | undefined): string | undefined {
  if (!width || !height) return undefined
  return `${width}/${height}`
}

/**
 * Check if media URL is expired (based on AWS S3 URL parameters)
 */
export function isUrlExpired(url: string | undefined): boolean {
  if (!url) return true
  
  try {
    const urlObj = new URL(url)
    const expires = urlObj.searchParams.get('X-Amz-Expires')
    const date = urlObj.searchParams.get('X-Amz-Date')
    
    if (!expires || !date) return false // Not an AWS URL, assume valid
    
    const expiresSeconds = parseInt(expires)
    const signedDate = new Date(
      date.slice(0, 4) + '-' + 
      date.slice(4, 6) + '-' + 
      date.slice(6, 8) + 'T' +
      date.slice(9, 11) + ':' +
      date.slice(11, 13) + ':' +
      date.slice(13, 15) + 'Z'
    )
    
    const expiryTime = signedDate.getTime() + (expiresSeconds * 1000)
    return Date.now() > expiryTime
    
  } catch (error) {
    console.warn('Error parsing URL expiry:', error)
    return false
  }
}

/**
 * Get file type icon based on MIME type
 */
export function getFileTypeIcon(mimeType: string | undefined): string {
  if (!mimeType) return '📄'
  
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType.startsWith('video/')) return '🎥'
  if (mimeType.startsWith('audio/')) return '🎵'
  if (mimeType.includes('pdf')) return '📕'
  if (mimeType.includes('doc') || mimeType.includes('word')) return '📄'
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️'
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return '🗜️'
  
  return '📄'
}

/**
 * Validate if thumbnail is valid base64 image
 */
export function isValidThumbnail(thumbnail: string | undefined): boolean {
  if (!thumbnail) return false
  
  try {
    // Check if it's valid base64
    const decoded = atob(thumbnail)
    // Check if it starts with JPEG header
    return decoded.charCodeAt(0) === 0xFF && decoded.charCodeAt(1) === 0xD8
  } catch {
    return false
  }
}

/**
 * Parse waveform data for audio visualization
 */
export function parseWaveform(waveformBase64: string | undefined): number[] {
  if (!waveformBase64) return []
  
  try {
    const decoded = atob(waveformBase64)
    const values: number[] = []
    
    for (let i = 0; i < decoded.length; i++) {
      values.push(decoded.charCodeAt(i))
    }
    
    return values
  } catch {
    return []
  }
}

/**
 * Get media type display name in Portuguese
 */
export function getMediaTypeDisplayName(
  messageType: string,
  isVoiceNote?: boolean,
  fileName?: string
): string {
  switch (messageType) {
    case 'image':
      return 'Imagem'
    case 'video':
      return 'Vídeo'
    case 'audio':
      return isVoiceNote ? 'Mensagem de voz' : 'Áudio'
    case 'document':
      return fileName ? `Documento: ${fileName}` : 'Documento'
    case 'sticker':
      return 'Figurinha'
    case 'location':
      return 'Localização'
    case 'contact':
      return 'Contato'
    default:
      return 'Mídia'
  }
}