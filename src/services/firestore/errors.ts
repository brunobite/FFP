function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function getFirestoreErrorCode(error: unknown): string {
  if (!isRecord(error)) return 'unknown'
  const rawCode = typeof error.code === 'string' ? error.code : 'unknown'
  return rawCode.startsWith('firestore/') ? rawCode.replace('firestore/', '') : rawCode
}

function getErrorMessage(error: unknown): string {
  return isRecord(error) && typeof error.message === 'string' ? error.message : String(error)
}

export function classifyFirestoreFailure(error: unknown):
  | 'permission/rules'
  | 'auth token'
  | 'app check'
  | 'network disabled/offline'
  | 'cache vazio/leitura antes de hidratar'
  | 'path/not-found'
  | 'unknown' {
  const code = getFirestoreErrorCode(error)
  const message = getErrorMessage(error).toLowerCase()

  if (code === 'permission-denied') {
    if (message.includes('appcheck') || message.includes('app check')) return 'app check'
    return 'permission/rules'
  }

  if (code === 'unauthenticated' || message.includes('auth') || message.includes('token')) {
    return 'auth token'
  }

  if (message.includes('appcheck') || message.includes('app check')) {
    return 'app check'
  }

  if (code === 'not-found' || message.includes('no document to update')) {
    return 'path/not-found'
  }

  if (message.includes('from cache') || message.includes('cache') || message.includes('client is offline')) {
    return 'cache vazio/leitura antes de hidratar'
  }

  if (isFirestoreOfflineError(error)) {
    return 'network disabled/offline'
  }

  return 'unknown'
}

export function isFirestoreOfflineError(error: unknown): boolean {
  const code = getFirestoreErrorCode(error)
  if (code === 'unavailable') return true
  if (code !== 'failed-precondition') return false

  const message = isRecord(error) && typeof error.message === 'string' ? error.message.toLowerCase() : ''
  return message.includes('offline') || message.includes('network')
}

export function mapFirestoreError(operation: string, error: unknown): string {
  const code = getFirestoreErrorCode(error)
  const message = isRecord(error) && typeof error.message === 'string' ? error.message : String(error || 'erro desconhecido')

  switch (code) {
    case 'permission-denied':
      return 'Você não tem permissão para acessar estes dados. Verifique as regras de segurança do Firestore.'
    case 'unauthenticated':
      return 'Sua sessão está ausente ou expirada. Faça login novamente para continuar.'
    case 'not-found':
      return 'Dados não encontrados no Firestore. Verifique se o caminho/coleção está correto.'
    case 'invalid-argument':
      return 'Os dados informados para esta operação são inválidos.'
    case 'unavailable':
      return 'Não foi possível conectar ao Firestore no momento. Verifique sua conexão e tente novamente.'
    case 'failed-precondition':
      if (message.toLowerCase().includes('offline') || message.toLowerCase().includes('network')) {
        return 'O Firestore está indisponível por rede/offline no navegador. Verifique sua conexão e tente novamente.'
      }
      if (message.toLowerCase().includes('não configurado') || message.toLowerCase().includes('configurado')) {
        return 'A inicialização do Firebase está incompleta. Verifique as variáveis VITE_FIREBASE_* do ambiente.'
      }
      return 'O Firestore recusou a operação devido a um pré-requisito não atendido.'
    case 'missing-family-group':
      return 'Você ainda não concluiu sua configuração inicial. Crie ou entre em um grupo familiar para continuar.'
    default:
      return `Falha ao ${operation} dados no Firestore: ${message}`
  }
}

export function logFirestoreError(context: string, error: unknown, extra?: Record<string, unknown>) {
  const code = getFirestoreErrorCode(error)
  const message = getErrorMessage(error)
  const diagnosis = classifyFirestoreFailure(error)
  const payload = {
    context,
    code,
    message,
    diagnosis,
    online: typeof navigator !== 'undefined' ? navigator.onLine : undefined,
    ...extra,
  }

  if (code === 'permission-denied' || code === 'unauthenticated') {
    console.warn('[firestore][authz]', payload)
    return
  }

  if (isFirestoreOfflineError(error)) {
    console.warn('[firestore][network]', payload)
    return
  }

  if (code === 'not-found' || message.includes('No document to update')) {
    console.error('[firestore][path]', payload)
    return
  }

  console.error('[firestore][unknown]', payload)
}
