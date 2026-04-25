import { redirect } from 'next/navigation'

export default function NewOrderPage() {
  redirect('/admin/orders?new=1')
}
