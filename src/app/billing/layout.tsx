import { hasPermission } from '@/lib/permissions'
import { redirect } from 'next/navigation'

export default async function BillingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const canView = await hasPermission('billing_view')
  
  if (!canView) {
    redirect('/')
  }

  return <>{children}</>
}
