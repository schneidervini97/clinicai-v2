// Brazilian format masks

export function applyCpfMask(value: string): string {
  const numbers = value.replace(/\D/g, '')
  
  if (numbers.length <= 11) {
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  
  return value
}

export function applyPhoneMask(value: string): string {
  const numbers = value.replace(/\D/g, '')
  
  if (numbers.length <= 11) {
    if (numbers.length <= 10) {
      // Landline: (11) 1234-5678
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d{1,4})$/, '$1-$2')
    } else {
      // Mobile: (11) 91234-5678
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d{1,4})$/, '$1-$2')
    }
  }
  
  return value
}

export function applyCepMask(value: string): string {
  const numbers = value.replace(/\D/g, '')
  
  if (numbers.length <= 8) {
    return numbers.replace(/(\d{5})(\d{1,3})$/, '$1-$2')
  }
  
  return value
}

export function applyRgMask(value: string): string {
  const numbers = value.replace(/\D/g, '')
  
  if (numbers.length <= 9) {
    return numbers
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1})$/, '$1-$2')
  }
  
  return value
}

// Legacy functions for backward compatibility
export function phoneMask(value: string): string {
  return applyPhoneMask(value)
}

export function cepMask(value: string): string {
  return applyCepMask(value)
}

// Utility functions
export function removeMask(value: string): string {
  return value.replace(/\D/g, '')
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR').format(dateObj)
}

export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj)
}

// Additional formatting functions
export function formatCPF(cpf: string): string {
  return applyCpfMask(cpf)
}

export function formatPhone(phone: string): string {
  return applyPhoneMask(phone)
}