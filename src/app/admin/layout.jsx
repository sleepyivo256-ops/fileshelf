import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export const metadata = { title: 'Admin — FileShelf' };

// Every page under /admin is server-side gated here AND every /api/admin
// route checks requireAdmin() again. Hiding UI alone is never the boundary.
export default async function AdminLayout({ children }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') redirect('/admin/login');
  return <>{children}</>;
}
