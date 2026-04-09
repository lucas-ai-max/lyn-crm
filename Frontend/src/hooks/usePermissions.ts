import { createElement, useMemo } from "react";
import { useRole, AppRole } from "./useRole";

/**
 * Permission actions available in the system.
 * Maps to specific capabilities based on user role.
 */
export type Permission =
    // Lead permissions
    | "leads.create"
    | "leads.read"
    | "leads.update"
    | "leads.delete"
    | "leads.assign"
    // User management
    | "users.read"
    | "users.create"
    | "users.update"
    | "users.delete"
    // Settings
    | "settings.company.read"
    | "settings.company.update"
    | "settings.integrations.manage"
    // Automation
    | "automation.flows.manage"
    | "automation.templates.manage"
    // Reports
    | "reports.view"
    | "reports.export"
    // Admin
    | "admin.panel.access"
    | "admin.audit_logs.view";

/**
 * Permission matrix mapping roles to their allowed permissions.
 * superadmin > admin > user in terms of access.
 */
const PERMISSION_MATRIX: Record<AppRole | "desativado", Permission[]> = {
    desativado: [], // No permissions
    user: [
        "leads.create",
        "leads.read",
        "leads.update",
        "reports.view",
    ],
    admin: [
        "leads.create",
        "leads.read",
        "leads.update",
        "leads.delete",
        "leads.assign",
        "users.read",
        "users.create",
        "users.update",
        "settings.company.read",
        "settings.company.update",
        "settings.integrations.manage",
        "automation.flows.manage",
        "automation.templates.manage",
        "reports.view",
        "reports.export",
        "admin.panel.access",
        "admin.audit_logs.view",
    ],
    superadmin: [
        "leads.create",
        "leads.read",
        "leads.update",
        "leads.delete",
        "leads.assign",
        "users.read",
        "users.create",
        "users.update",
        "users.delete",
        "settings.company.read",
        "settings.company.update",
        "settings.integrations.manage",
        "automation.flows.manage",
        "automation.templates.manage",
        "reports.view",
        "reports.export",
        "admin.panel.access",
        "admin.audit_logs.view",
    ],
};

export interface UsePermissionsReturn {
    /** Check if user has a specific permission */
    can: (permission: Permission) => boolean;
    /** Check if user has ALL of the specified permissions */
    canAll: (permissions: Permission[]) => boolean;
    /** Check if user has ANY of the specified permissions */
    canAny: (permissions: Permission[]) => boolean;
    /** List of all permissions the current user has */
    permissions: Permission[];
    /** Whether permissions are still loading */
    isLoading: boolean;
}

/**
 * Hook to check user permissions based on their role.
 * Provides granular permission checks for UI visibility control.
 * 
 * @example
 * ```tsx
 * const { can, canAny } = usePermissions();
 * 
 * // Hide delete button for users without permission
 * {can("leads.delete") && <DeleteButton />}
 * 
 * // Show admin panel for admin or superadmin
 * {can("admin.panel.access") && <AdminPanel />}
 * ```
 */
export const usePermissions = (): UsePermissionsReturn => {
    const { role, isLoading } = useRole();

    const permissions = useMemo(() => {
        if (!role) return [];
        return PERMISSION_MATRIX[role as keyof typeof PERMISSION_MATRIX] || [];
    }, [role]);

    const can = (permission: Permission): boolean => {
        return permissions.includes(permission);
    };

    const canAll = (requiredPermissions: Permission[]): boolean => {
        return requiredPermissions.every((p) => permissions.includes(p));
    };

    const canAny = (requiredPermissions: Permission[]): boolean => {
        return requiredPermissions.some((p) => permissions.includes(p));
    };

    return {
        can,
        canAll,
        canAny,
        permissions,
        isLoading,
    };
};

/**
 * Higher-order component to protect components based on permissions.
 * 
 * @example
 * ```tsx
 * const ProtectedAdminPanel = withPermission(AdminPanel, "admin.panel.access");
 * ```
 */
export const withPermission = <P extends object>(
    Component: React.ComponentType<P>,
    permission: Permission,
    Fallback: React.ComponentType = () => null
) => {
    return function PermissionWrapper(props: P) {
        const { can, isLoading } = usePermissions();

        if (isLoading) return null;
        if (!can(permission)) return createElement(Fallback);

        return createElement(Component, props);
    };
};
