import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/server/session';

export default async function Home() {
  const user = await getSessionUser();

  if (!user) {
    redirect('/auth/login');
  }

  redirect(user.role === 'admin' ? '/admin' : '/faculty');
}
