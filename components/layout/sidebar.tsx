"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Building2, LayoutDashboard, Receipt, Users,
  Wrench, FileText, MessageSquare, ChevronDown, LogOut, Bell, ArrowLeftRight, PiggyBank, Settings,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface SidebarProps {
  schemeId: string;
  schemeName: string;
}

export function Sidebar({ schemeId, schemeName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const nav = [
    { label: "Overview", icon: LayoutDashboard, href: `/dashboard/${schemeId}` },
    { label: "Lots", icon: Building2, href: `/dashboard/${schemeId}/lots` },
    { label: "Levies", icon: Receipt, href: `/dashboard/${schemeId}/levies` },
    { label: "Transactions", icon: ArrowLeftRight, href: `/dashboard/${schemeId}/transactions` },
    { label: "Sinking fund", icon: PiggyBank, href: `/dashboard/${schemeId}/sinking-fund` },
    { label: "Meetings", icon: Users, href: `/dashboard/${schemeId}/meetings` },
    { label: "Maintenance", icon: Wrench, href: `/dashboard/${schemeId}/maintenance` },
    { label: "Documents", icon: FileText, href: `/dashboard/${schemeId}/documents` },
    { label: "Notices", icon: MessageSquare, href: `/dashboard/${schemeId}/notices` },
    { label: "Announcements", icon: Bell, href: `/dashboard/${schemeId}/announcements` },
  ];

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="w-60 shrink-0 border-r border-gray-200 bg-white flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gray-900 rounded-md flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900 text-sm">bcorp</span>
        </div>
      </div>

      <div className="p-3 border-b border-gray-200">
        <button className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 text-left">
          <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5 text-gray-600" />
          </div>
          <span className="text-sm font-medium text-gray-900 truncate flex-1">{schemeName}</span>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        </button>
      </div>

      <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto">
        {nav.map(({ label, icon: Icon, href }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-200">
        <Link
          href={`/dashboard/${schemeId}/settings`}
          className={cn(
            "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors mb-0.5",
            pathname === `/dashboard/${schemeId}/settings`
              ? "bg-gray-100 text-gray-900 font-medium"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          )}
        >
          <Settings className="w-4 h-4 shrink-0" />
          Settings
        </Link>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
