import { createFileRoute } from '@tanstack/react-router'
import { CompleteProfilePage } from '@/features/auth'

export const Route = createFileRoute('/auth/complete-profile')({
  component: CompleteProfilePage,
})
