function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function getFirestoreErrorCode(error: unknown): string {
  if (!isRecord(error)) return 'unknown'
  const code = typeof error.code === 'string' ? error.code : 'unknown'
  return code
}

export function isFirestoreOfflineError(error: unknown): boolean {
  const code = getFirestoreErrorCode(error)
  return code === 'unavailable' || code === 'failed-precondition'
}

export function mapFirestoreError(operation: string, error: unknown): string {
  const code = getFirestoreErrorCode(error)
  const message = isRecord(error) && typeof error.message === 'string' ? error.message : String(error || 'erro desconhecido')

  switch (code) {
    case 'permission-denied':
      return 'Você não tem permissão para acessar estas categorias. Verifique as regras de segurança do Firestore.'
    case 'unauthenticated':
      return 'Sua sessão expirou. Faça login novamente para continuar.'
    case 'not-found':
      return 'Dados não encontrados no Firestore. Verifique se o caminho/coleção está correto.'
    case 'invalid-argument':
      return 'Os dados informados para a categoria são inválidos.'
    case 'unavailable':
      return 'Não foi possível conectar ao Firestore no momento. Verifique sua conexão e tente novamente.'
    case 'failed-precondition':
      if (message.toLowerCase().includes('offline')) {
        return 'O Firestore está em modo offline no navegador. Recarregue a página e tente novamente.'
      }
      return 'O Firestore recusou a operação devido a um pré-requisito não atendido.'
    default:
      return `Falha ao ${operation} categoria(s): ${message}`
  }
}

export function logFirestoreError(context: string, error: unknown, extra?: Record<string, unknown>) {
  const code = getFirestoreErrorCode(error)
  const message = isRecord(error) && typeof error.message === 'string' ? error.message : String(error)
  const payload = {
    context,
    code,
    message,
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
