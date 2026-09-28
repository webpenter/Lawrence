import { headers } from 'next/headers';
import { getPayloadClient } from '@/lib/db';
import { viewerFromUser, type Viewer } from '@/lib/access/viewer';

export async function getCurrentViewer(): Promise<Viewer> {
  const payload = await getPayloadClient();
  const reqHeaders = await headers();
  // Using payload.auth requires passing headers object in v3
  const { user } = await payload.auth({ headers: reqHeaders });
  return viewerFromUser(user);
}
