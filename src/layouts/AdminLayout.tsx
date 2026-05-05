
import { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Toaster } from "sonner";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[#0a0a0c] text-foreground">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto relative">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      <Toaster position="bottom-right" theme="dark" closeButton />
    </div>
  );
}
