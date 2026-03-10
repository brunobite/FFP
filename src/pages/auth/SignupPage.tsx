import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { signupSchema, type SignupFormData } from '@/features/auth/schemas'
import { useAuth } from '@/hooks/useAuth'
import { Button, Input, Card, CardContent } from '@/components/ui'

export function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupFormData) => {
    try {
      setError('')
      await signUp(data.email, data.password, data.full_name)
      navigate('/')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao criar conta. Tente novamente.'
      setError(message)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="mb-6 text-center text-xl font-bold text-text-primary">
          Criar sua conta
        </h2>

        {error && (
          <div className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nome completo"
            placeholder="Seu nome"
            error={errors.full_name?.message}
            {...register('full_name')}
          />
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
            placeholder="Mínimo 8 caracteres"
            error={errors.password?.message}
            {...register('password')}
          />
          <Input
            label="Confirmar senha"
            type="password"
            placeholder="Repita a senha"
            error={errors.confirm_password?.message}
            {...register('confirm_password')}
          />
          <Button
            type="submit"
            className="w-full"
            isLoading={isSubmitting}
            leftIcon={<UserPlus className="h-4 w-4" />}
          >
            Criar conta
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-text-secondary">
          Já tem conta?{' '}
          <Link to="/auth/login" className="text-primary hover:text-primary-dark font-semibold">
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
