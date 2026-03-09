import { Spinner } from './Spinner'

interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({ message = 'Carregando o FFP...' }: LoadingScreenProps) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-bg-main">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-3xl font-bold text-white">
          $
        </div>
        <Spinner size="lg" />
        <p className="text-sm text-text-secondary">{message}</p>
      </div>
    </div>
  )
}
