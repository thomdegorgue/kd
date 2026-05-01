import { notFound, redirect } from 'next/navigation'
import { getStoreBySlug } from '@/lib/db/queries/stores'
import { getPublicPaymentMethods } from '@/lib/actions/checkout'
import { CheckoutView } from './checkout-view'

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const [store, paymentMethods] = await Promise.all([
    getStoreBySlug(slug),
    getPublicPaymentMethods(slug),
  ])

  if (!store) notFound()
  if (!store.modules.checkout || paymentMethods.length === 0) redirect(`/${slug}`)

  return <CheckoutView paymentMethods={paymentMethods} />
}
