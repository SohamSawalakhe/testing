"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  Settings,
  LogOut,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/context/sidebar-provider";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "react-toastify";

const menuItems = [
  { href: "/admin-super/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin-super/vendors", icon: Store, label: "Vendors" },
  { href: "/admin-super/settings", icon: Settings, label: "Settings" },
];

export function SidebarSuperAdmin() {
  const pathname = usePathname();
  const router = useRouter();
  const { isCollapsed, toggleSidebar } = useSidebar();

  const [isMobile, setIsMobile] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleLogout = async () => {
    try {
      await api.post("/super-admin/logout");
      router.push("/admin-login");
    } catch {
      toast.error("Logout failed");
    }
  };

  const renderItems = (collapsed = false) =>
    menuItems.map(({ href, icon: Icon, label }) => {
      const isActive = pathname.startsWith(href);
      return (
        <div key={href} className="group relative">
          <Link
            href={href}
            onClick={() => {
              if (isMobile) setIsMobileOpen(false);
            }}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50",
              collapsed && "justify-center px-0",
            )}
            title={collapsed ? label : undefined}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </Link>

          {collapsed && (
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              <div className="bg-sidebar-foreground text-sidebar px-2 py-1 rounded text-xs shadow-lg whitespace-nowrap">
                {label}
              </div>
            </div>
          )}
        </div>
      );
    });

  const logoutBtn = (collapsed = false) => (
    <button
      onClick={handleLogout}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-sidebar-accent/50 w-full text-sidebar-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      <LogOut className="w-5 h-5" />
      {!collapsed && "Logout"}
    </button>
  );

  /* ---- MOBILE ---- */
  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setIsMobileOpen((v) => !v)}
          className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-sidebar text-sidebar-foreground md:hidden"
        >
          {isMobileOpen ? <X /> : <Menu />}
        </button>

        {isMobileOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMobileOpen(false)}
          />
        )}

        <aside
          className={cn(
            "fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300",
            isMobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-center px-2 h-16 border-b border-sidebar-border">
            <Logo className="h-12 w-full max-w-[220px]" />
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {renderItems(false)}
          </nav>
          <div className="border-t border-sidebar-border p-3">
            {logoutBtn(false)}
          </div>
        </aside>
      </>
    );
  }

  /* ---- DESKTOP ---- */
  return (
    <aside
      className={cn(
        "hidden md:flex fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border flex-col transition-all duration-300",
        isCollapsed ? "w-20" : "w-64",
      )}
    >
      {/* Logo area */}
      <div className="flex items-center justify-between px-2 h-16 border-b border-sidebar-border">
        <div
          className={cn(
            "flex items-center transition-all duration-300",
            isCollapsed ? "justify-center w-full" : "justify-start pl-4 flex-1",
          )}
        >
          <Logo
            collapsed={isCollapsed}
            isSidebar={true}
            className={cn(
              "transition-all duration-300",
              isCollapsed ? "h-12 w-12" : "h-12 w-full max-w-[220px]",
            )}
          />
        </div>

        {!isCollapsed && (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-sidebar-accent ml-1"
          >
            <ChevronRight className="w-4 h-4 text-sidebar-foreground" />
          </button>
        )}
        {isCollapsed && (
          <button
            onClick={toggleSidebar}
            className="absolute right-2 top-5 p-1.5 rounded-lg hover:bg-sidebar-accent"
          >
            <ChevronRight className="w-4 h-4 rotate-180 text-sidebar-foreground" />
          </button>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {renderItems(isCollapsed)}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        {logoutBtn(isCollapsed)}
      </div>
    </aside>
  );
}

export default SidebarSuperAdmin;
