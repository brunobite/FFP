import { Spinner } from './Spinner'

export function LoadingScreen() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-bg-main">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-3xl font-bold text-white">
          $
        </div>
        <Spinner size="lg" />
      </div>
    </div>
  )
}
