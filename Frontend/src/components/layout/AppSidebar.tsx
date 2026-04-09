import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  BarChart3,
  Calendar,
  Settings,
  Sun,
  Moon,
  LogOut,
  Plus,
  UserPlus,
  UserCog,
  Bot,
  Workflow,
  Zap,
  Globe,
  ChevronDown,
  ChevronRight,
  Headset,
  Instagram,
  Cable,
  Inbox,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LeadModal } from "@/components/dashboard/LeadModal";
import { supabase } from "@/integrations/supabase/client";
import { LynLogo } from "@/components/LynLogo";
import { useProfile } from "@/hooks/useProfile";

// --- Sidebar Menu Configuration ---
const principalItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Leads", url: "/dashboard/clients", icon: Users },
  { title: "Relatórios", url: "/dashboard/reports", icon: BarChart3 },
];

const caixaDeEntradaSubItems = [
  { title: "WhatsApp", url: "/dashboard/whatsapp/chat", icon: MessageSquare },
  { title: "Instagram", url: "/dashboard/instagram", icon: Instagram },
];

const gestaoItems = [
  { title: "Agenda", url: "/dashboard/agenda", icon: Calendar },
  { title: "Configurações", url: "/dashboard/settings", icon: Settings },
];

const conexoesSubItems = [
  { title: "WhatsApp Admin", url: "/dashboard/whatsapp/instances", icon: MessageSquare },
  { title: "Instagram Admin", url: "/dashboard/instagram/admin", icon: Instagram },
];

const usersItem = { title: "Usuários", url: "/dashboard/users", icon: UserCog };

export function AppSidebar() {
  const { state } = useSidebar();
  const { signOut, user } = useAuth();
  const location = useLocation();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("lyn_profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      setUserRole(data?.role || null);
    };
    fetchUserRole();
  }, [user?.id]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark");
  };

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };

  const isCollapsed = state === "collapsed";
  const canAccessUsers = userRole === "admin" || userRole === "superadmin";
  const [caixaOpen, setCaixaOpen] = useState(
    location.pathname.includes("/whatsapp/chat") || location.pathname.includes("/instagram")
  );
  const [conexoesOpen, setConexoesOpen] = useState(
    location.pathname.includes("/whatsapp/instances") || location.pathname.includes("/instagram/admin")
  );

  const gestaoFinal = canAccessUsers
    ? [gestaoItems[0], usersItem, ...gestaoItems.slice(1)]
    : gestaoItems;

  const initials = profile?.first_name && profile?.last_name
    ? `${profile.first_name[0]}${profile.last_name[0]}`
    : profile?.first_name?.[0] || "U";

  const renderMenuItem = (item: { title: string; url: string; icon: React.ComponentType<{ className?: string }>; hasBadge?: boolean }) => {
    const active = isActive(item.url);
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          asChild
          isActive={active}
          tooltip={isCollapsed ? item.title : undefined}
          className={`h-10 font-poppins font-medium transition-all duration-200
            ${active
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25 rounded-xl'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded-xl'
            }`}
        >
          <NavLink
            to={item.url}
            end={item.url === "/dashboard"}
            className="flex items-center gap-3 px-3"
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm truncate">{item.title}</span>
            {item.hasBadge && !isCollapsed && (
              <span className="ml-auto inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                12
              </span>
            )}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900">
      {/* Logo */}
      <SidebarHeader className="border-b border-slate-200 dark:border-slate-700/60 h-28 flex items-center">
        <div className="flex items-center px-3 py-4">
          {isCollapsed ? (
            <LynLogo variant="symbol" className="h-20 w-auto" />
          ) : (
            <LynLogo variant="symbol" className="h-16 w-16" showText text="Lyn CRM" textClassName="text-xl font-poppins font-bold" />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-3 px-3">
        {/* PRINCIPAL Section */}
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {principalItems.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* CAIXA DE ENTRADA Section */}
        <SidebarGroup className="p-0 mt-1">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={isCollapsed ? "Caixa de Entrada" : undefined}
                  onClick={() => setCaixaOpen(!caixaOpen)}
                  className={`h-10 font-poppins font-medium transition-all duration-200 rounded-xl cursor-pointer
                    ${caixaDeEntradaSubItems.some((item) => isActive(item.url))
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                >
                  <div className="flex items-center gap-3 w-full">
                    <Inbox className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && (
                      <>
                        <span className="text-sm truncate flex-1">Caixa de Entrada</span>
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${caixaOpen ? '' : '-rotate-90'}`} />
                      </>
                    )}
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {caixaOpen && !isCollapsed && (
                <div className="ml-4 pl-3 space-y-0.5">
                  {caixaDeEntradaSubItems.map(renderMenuItem)}
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* GESTÃO Section */}
        <SidebarGroup className="p-0 mt-4">
          {!isCollapsed && (
            <p className="text-[10px] uppercase tracking-widest text-slate-300 dark:text-slate-600 font-semibold mb-1 px-3">
              Gestão
            </p>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {gestaoFinal.map(renderMenuItem)}

              {/* Conexões - collapsible */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={isCollapsed ? "Conexões" : undefined}
                  onClick={() => setConexoesOpen(!conexoesOpen)}
                  className={`h-10 font-poppins font-medium transition-all duration-200 rounded-xl cursor-pointer
                    ${conexoesSubItems.some((item) => isActive(item.url))
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                >
                  <div className="flex items-center gap-3 w-full">
                    <Cable className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && (
                      <>
                        <span className="text-sm truncate flex-1">Conexões</span>
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${conexoesOpen ? '' : '-rotate-90'}`} />
                      </>
                    )}
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Conexões sub-items */}
              {conexoesOpen && !isCollapsed && (
                <div className="ml-4 pl-3 space-y-0.5">
                  {conexoesSubItems.map(renderMenuItem)}
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      <SidebarFooter className="border-t border-slate-200 dark:border-slate-700/60 p-3">
        {/* Add Lead Button */}
        <Button
          className="w-full justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-poppins font-medium h-10 rounded-xl shadow-md shadow-indigo-500/25 transition-all duration-300"
          size={isCollapsed ? "icon" : "default"}
          onClick={() => setIsLeadModalOpen(true)}
        >
          {isCollapsed ? (
            <UserPlus className="h-5 w-5" />
          ) : (
            <>
              <Plus className="h-4 w-4" />
              <span className="text-sm">Adicionar Lead</span>
            </>
          )}
        </Button>

        {/* User Card + Actions */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={theme === "light" ? "Dark mode" : "Light mode"}
              >
                {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>
              <button
                onClick={signOut}
                className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* User info */}
              <div className="flex items-center gap-3 px-1">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-poppins truncate">
                    {profile?.first_name} {profile?.last_name}
                  </p>
                  <p className="text-xs text-slate-400 font-poppins capitalize truncate">
                    {profile?.role || "Membro"}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={toggleTheme}
                  className="flex-1 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-center"
                  title={theme === "light" ? "Dark mode" : "Light mode"}
                >
                  {theme === "light" ? <Moon className="h-4 w-4 mx-auto" /> : <Sun className="h-4 w-4 mx-auto" />}
                </button>
                <button
                  onClick={signOut}
                  className="flex-1 p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-center"
                  title="Sair"
                >
                  <LogOut className="h-4 w-4 mx-auto" />
                </button>
              </div>
            </div>
          )}
        </div>
      </SidebarFooter>

      <LeadModal
        open={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        onSave={() => queryClient.invalidateQueries({ queryKey: ["leads"] })}
        mode="create"
      />
    </Sidebar>
  );
}