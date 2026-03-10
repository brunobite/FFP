import { useState, useEffect } from 'react'
import { WifiOff } from 'lucide-react'
import { Button } from './Button'

export function OfflineFallbackScreen() {
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      window.location.reload()
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  const handleRetry = () => {
    setRetrying(true)
    window.location.reload()
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-bg-main">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-warning/10 text-warning">
          <WifiOff className="h-8 w-8" />
        </div>
        <h1 className="text-lg font-semibold text-text-primary">
          Sem conexão com a internet
        </h1>
        <p className="text-sm text-text-secondary">
          Não foi possível carregar seus dados. Verifique sua conexão e tente
          novamente. Os dados serão sincronizados automaticamente quando a
          conexão for restabelecida.
        </p>
        <Button variant="outline" onClick={handleRetry} isLoading={retrying}>
          Tentar novamente
        </Button>
      </div>
    </div>
  )
}
