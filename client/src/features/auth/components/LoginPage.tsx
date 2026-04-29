import { Link, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { auth } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'

const schema = z.object({
  email:    z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})
type Form = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore((s) => s.setAuth)
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } =
    useForm<Form>({ resolver: zodResolver(schema) })

  async function onSubmit(data: Form) {
    try {
      const res = await auth.login(data)
      setAuth(res.accessToken, res.user)
      if (!res.user.phone || !res.user.neighborhood) {
        navigate({ to: '/auth/complete-profile' })
      } else {
        navigate({ to: '/dashboard' })
      }
    } catch (err: unknown) {
      setError('root', { message: err instanceof Error ? err.message : 'Invalid email or password' })
    }
  }

  return (
    <main className="page-wrap flex min-h-[70vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md" style={{ background: 'var(--surface-strong)', border: '1px solid var(--line)' }}>
        <CardHeader className="pb-4">
          <p className="island-kicker mb-1">Welcome back</p>
          <CardTitle className="display-title text-3xl" style={{ color: 'var(--text-dark)' }}>Sign in</CardTitle>
          <CardDescription style={{ color: 'var(--text-soft)' }}>Enter your credentials to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" aria-invalid={!!errors.email} {...register('email')} />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" aria-invalid={!!errors.password} {...register('password')} />
              {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
            </div>
            {errors.root && (
              <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{errors.root.message}</div>
            )}
            <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-soft)' }}>
            Don't have an account?{' '}
            <Link to="/auth/register" className="font-semibold" style={{ color: 'var(--brand)' }}>Sign up</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
