import { redirect } from 'next/navigation';

export default async function PortalRedirectPage({
  params,
}: {
  params: Promise<{ portalId: string }>;
}) {
  const { portalId } = await params;
  redirect(`/portal/${portalId}/shipments`);
}