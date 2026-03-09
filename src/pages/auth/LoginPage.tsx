import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LogIn } from 'lucide-react'
import { loginSchema, type LoginFormData } from '@/features/auth/schemas'
import { useAuth } from '@/hooks/useAuth'
import { Button, Card, CardContent, Input } from '@/components/ui'
import { useNavigate } from 'react-router-dom'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError('')
      await signIn(data.email, data.password)
      navigate('/dashboard')
    } catch {
      setError('E-mail ou senha incorretos.')
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="mb-2 text-center text-xl font-bold text-text-primary">Entrar na sua conta</h2>
        <p className="mb-6 text-center text-sm text-text-secondary">Acesse o FFP para acompanhar a vida financeira da família.</p>

        {error ? <div className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="E-mail"
            type="email"
            placeholder="seu@email.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Senha"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />
          <Button type="submit" className="w-full" isLoading={isSubmitting} leftIcon={<LogIn className="h-4 w-4" />}>
            Entrar
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
