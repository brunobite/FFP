import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { loginSchema, type LoginFormData } from '@/features/auth/schemas'
import { useAuth } from '@/hooks/useAuth'
import { Button, Input, Card, CardContent } from '@/components/ui'

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
      navigate('/')
    } catch {
      setError('E-mail ou senha incorretos.')
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="mb-6 text-center text-xl font-bold text-text-primary">
          Entrar na sua conta
        </h2>

        {error && (
          <div className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

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
          <Button
            type="submit"
            className="w-full"
            isLoading={isSubmitting}
            leftIcon={<LogIn className="h-4 w-4" />}
          >
            Entrar
          </Button>
        </form>

        <div className="mt-4 space-y-2 text-center text-sm">
          <Link
            to="/auth/forgot-password"
            className="block text-primary hover:text-primary-dark"
          >
            Esqueceu sua senha?
          </Link>
          <p className="text-text-secondary">
            Não tem conta?{' '}
            <Link to="/auth/signup" className="text-primary hover:text-primary-dark font-semibold">
              Criar conta
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
