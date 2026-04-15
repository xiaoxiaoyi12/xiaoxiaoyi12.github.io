'use client';

import AdminSidebar, { AdminMobileNav } from '@/components/admin/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4">
      <AdminMobileNav />
      <div className="flex">
        <AdminSidebar />
        <div className="flex-1 p-6 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
