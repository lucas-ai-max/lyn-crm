import { useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useIsSuperAdmin } from "@/hooks/useTickets";

export function SuperAdminGuard({ children }: { children: ReactNode }) {
    const isSuperAdmin = useIsSuperAdmin();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isSuperAdmin) {
            navigate("/dashboard/support", { replace: true });
        }
    }, [isSuperAdmin, navigate]);

    if (!isSuperAdmin) return null;
    return <>{children}</>;
}
