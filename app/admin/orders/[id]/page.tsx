import OrderDetailClient from './order-detail-client'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params
  return <OrderDetailClient orderId={id} />
}
