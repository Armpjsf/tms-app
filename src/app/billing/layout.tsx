import { hasPermission } from '@/lib/permissions'
import { redirect } from 'next/navigation'

export default async function BillingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [canViewBilling, canViewInvoices, canViewPayouts] = await Promise.all([
    hasPermission('navigation.billing_customer'),
    hasPermission('navigation.invoices'),
    hasPermission('navigation.payouts')
  ])
  
  if (!canViewBilling && !canViewInvoices && !canViewPayouts) {
    redirect('/dashboard')
  }

  return <>{children}</>
}
