import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useProfile } from "@/hooks/useProfile";
import { Search } from "lucide-react";
import { useState } from "react";

export default function AppShell() {
  const { data: profile } = useProfile();
  const [searchFocused, setSearchFocused] = useState(false);

  const initials = profile?.first_name && profile?.last_name
    ? `${profile.first_name[0]}${profile.last_name[0]}`
    : profile?.first_name?.[0] || "U";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50 dark:bg-dark-bg">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          {/* Sticky Header */}
          <div className="sticky top-0 z-40 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-700/60 h-16">
            <div className="flex h-16 items-center justify-between px-6 gap-4">
              {/* Left: Sidebar trigger + Search */}
              <div className="flex items-center gap-4 flex-1">
                <SidebarTrigger className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200" />
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar leads, automações..."
                    className={`pl-10 pr-12 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all duration-300 font-poppins ${searchFocused ? 'w-96' : 'w-72'}`}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                  />
                  <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 items-center gap-1 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-1.5 font-mono text-[10px] font-medium text-slate-400">
                    ⌘K
                  </kbd>
                </div>
              </div>

              {/* Right: Notifications + Profile */}
              <div className="flex items-center gap-3">


                {/* User Profile */}
                <div className="flex items-center gap-3 cursor-pointer">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white text-sm font-semibold shadow-md shadow-indigo-500/25">
                    {initials}
                  </div>
                  <div className="hidden md:block">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-poppins leading-none">
                      {profile?.first_name || "Usuário"}
                    </p>
                    <p className="text-xs text-slate-400 font-poppins capitalize mt-0.5">
                      {profile?.role || "Membro"}
                    </p>
                  </div>
                  <svg className="h-4 w-4 text-slate-400 hidden md:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Page Content */}
          <div className="p-4 md:p-6 font-poppins">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
