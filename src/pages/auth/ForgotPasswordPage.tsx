import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/features/auth/schemas'
import { useAuth } from '@/hooks/useAuth'
import { Button, Input, Card, CardContent } from '@/components/ui'

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setError('')
      await resetPassword(data.email)
      setSuccess(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao enviar e-mail. Tente novamente.'
      setError(message)
    }
  }

  if (success) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
            <Mail className="h-6 w-6 text-success" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-text-primary">E-mail enviado!</h2>
          <p className="mb-6 text-sm text-text-secondary">
            Verifique sua caixa de entrada para redefinir sua senha.
          </p>
          <Link to="/login" className="text-sm text-primary hover:text-primary-dark font-semibold">
            Voltar para o login
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="mb-2 text-center text-xl font-bold text-text-primary">
          Recuperar senha
        </h2>
        <p className="mb-6 text-center text-sm text-text-secondary">
          Informe seu e-mail para receber o link de recuperação.
        </p>

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
          <Button
            type="submit"
            className="w-full"
            isLoading={isSubmitting}
            leftIcon={<Mail className="h-4 w-4" />}
          >
            Enviar link de recuperação
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-text-secondary">
          <Link to="/login" className="text-primary hover:text-primary-dark font-semibold">
            Voltar para o login
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
