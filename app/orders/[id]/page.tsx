import OrderTrackerClient from './order-tracker-client'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CustomerOrderTrackerPage({ params }: PageProps) {
  const { id } = await params
  return <OrderTrackerClient orderId={id} />
}
