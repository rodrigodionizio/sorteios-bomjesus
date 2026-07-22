import { AdminSidebar } from "@/components/admin/sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AdminSidebar />
      <main className="min-w-0 flex-1 px-6 py-7 sm:px-8 lg:px-10">
        {children}
      </main>
    </div>
  );
}
