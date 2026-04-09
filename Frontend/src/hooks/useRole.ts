import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "user" | "admin" | "superadmin" | "desativado";

export const useRole = () => {
  const { user } = useAuth();

  const { data: role, isLoading } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("lyn_profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data.role as AppRole;
    },
    enabled: !!user?.id,
  });

  const hasRole = (requiredRole: AppRole) => {
    if (!role) return false;

    const roleHierarchy = {
      user: 1,
      admin: 2,
      superadmin: 3,
    };

    return roleHierarchy[role] >= roleHierarchy[requiredRole];
  };

  return {
    role,
    isLoading,
    isUser: role === "user",
    isAdmin: role === "admin" || role === "superadmin",
    isSuperAdmin: role === "superadmin",
    hasRole,
  };
};
