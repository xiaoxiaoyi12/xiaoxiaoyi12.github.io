'use client';

import AdminSidebar from '@/components/admin/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex -mx-4 -mt-0">
      <AdminSidebar />
      <div className="flex-1 p-6 min-w-0">
        {children}
      </div>
    </div>
  );
}
