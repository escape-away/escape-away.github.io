import type { ReactNode } from 'react';
import { AdminShell } from '@/system/ui/shell';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
