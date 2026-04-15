'use client';

import AdminSidebar, { AdminMobileNav } from '@/components/admin/AdminSidebar';
import { ToastProvider } from '@/components/admin/Toast';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="-mx-4">
        <AdminMobileNav />
        <div className="flex">
          <AdminSidebar />
          <div className="flex-1 p-6 min-w-0">
            {children}
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
