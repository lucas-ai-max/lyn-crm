import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers, useUpdateUser, useCreateUser, useDeleteUser, User } from '@/hooks/useUsers';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserManagementModal } from '@/components/dashboard/users/UserManagementModal';
import { CreateCompanyUserModal } from '@/components/dashboard/users/CreateCompanyUserModal';
import { AddEmployeeModal } from '@/components/AddEmployeeModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, Search, Loader2, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useCompany } from '@/hooks/useCompany';

export default function UsersManagement() {
  const { user: currentUser, profile, companyId, loading: authLoading } = useAuth();
  const { company } = useCompany();
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [isCreateCompanyModalOpen, setIsCreateCompanyModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const currentUserRole = profile?.role ?? null;
  const currentUserCompanyId = companyId;
  const currentUserCompanyName = company?.name ?? null;

  const { data: users, isLoading, refetch: refetchUsers } = useUsers(showInactive, currentUserRole, currentUserCompanyId);
  const updateUser = useUpdateUser();
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();

  if (authLoading || !currentUserRole) {
    return (
      <div className="container mx-auto py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const canAccessPage = currentUserRole === 'admin' || currentUserRole === 'superadmin';
  const canCreateUser = currentUserRole === 'admin' || currentUserRole === 'superadmin';
  const canEditUser = (userRole: string | null) => {
    if (currentUserRole === 'superadmin') return true;
    // Admins podem editar todos os usuários da mesma empresa, exceto superadmins
    if (currentUserRole === 'admin' && userRole !== 'superadmin') return true;
    return false;
  };

  const filteredUsers = users?.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const companyName = (user.company?.name || '').toLowerCase();
    return fullName.includes(searchLower) || companyName.includes(searchLower) || user.id.toLowerCase().includes(searchLower);
  });

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'superadmin':
        return <Badge className="bg-purple-500 hover:bg-purple-600">Super Admin</Badge>;
      case 'admin':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Admin</Badge>;
      case 'desativado':
        return <Badge variant="destructive">Desativado</Badge>;
      default:
        return <Badge variant="secondary">Usuário</Badge>;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado!',
      description: 'ID copiado para a área de transferência.',
    });
  };

  const handleSave = async (data: any) => {
    if (selectedUser) {
      // Editar usuário existente
      await updateUser.mutateAsync({
        userId: selectedUser.id,
        updates: {
          first_name: data.first_name,
          last_name: data.last_name,
          role: data.role,
          ...(currentUserRole === 'superadmin' && data.company_id ? { company_id: data.company_id } : {}),
        },
      });
    } else {
      // Criar novo usuário
      const companyIdForNewUser =
        currentUserRole === 'admin'
          ? currentUserCompanyId
          : data.company_id || null;
      await createUser.mutateAsync({
        email: data.email,
        password: data.password,
        userData: {
          first_name: data.first_name,
          last_name: data.last_name,
          role: data.role,
          company_id: companyIdForNewUser || undefined,
        },
      });
    }
  };

  const handleDelete = async () => {
    if (userToDelete) {
      await deleteUser.mutateAsync(userToDelete.id);
      setUserToDelete(null);
    }
  };

  if (!canAccessPage) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              Você não tem permissão para acessar esta página.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Gerenciamento de Usuários</CardTitle>
              <CardDescription>
                {currentUserRole === 'superadmin'
                  ? 'Gerencie todos os usuários do sistema'
                  : `Gerencie os usuários da empresa: ${currentUserCompanyName || 'Não definida'}`
                }
              </CardDescription>
            </div>
            {canCreateUser && (
              <div className="flex items-center gap-2">
                {currentUserRole === 'superadmin' && (
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateCompanyModalOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nova empresa e usuário
                  </Button>
                )}
                <Button
                  onClick={() => setIsAddEmployeeModalOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Usuário
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, empresa ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="show-inactive">Mostrar desativados</Label>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {currentUserRole === 'superadmin' && <TableHead>ID</TableHead>}
                    <TableHead>Nome</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Data de Criação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={currentUserRole === 'superadmin' ? 6 : 5} className="text-center text-muted-foreground">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers?.map((user) => (
                      <TableRow key={user.id}>
                        {currentUserRole === 'superadmin' && (
                          <TableCell className="font-mono text-xs">
                            <div className="flex items-center gap-2">
                              <span className="truncate max-w-[120px]" title={user.id}>
                                {user.id.substring(0, 8)}...
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(user.id)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="font-medium">
                          {user.first_name} {user.last_name}
                        </TableCell>
                        <TableCell>{user.company?.name || '-'}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString('pt-BR')
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {canEditUser(user.role) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsModalOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {canEditUser(user.role) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setUserToDelete(user)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                            {!canEditUser(user.role) && (
                              <span className="text-sm text-muted-foreground">
                                Sem permissão
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <UserManagementModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        user={selectedUser}
        onSave={handleSave}
        currentUserRole={currentUserRole}
        currentUserCompanyId={currentUserCompanyId}
        currentUserCompanyName={currentUserCompanyName}
        isCreating={createUser.isPending || updateUser.isPending}
      />

      <AddEmployeeModal
        open={isAddEmployeeModalOpen}
        onOpenChange={setIsAddEmployeeModalOpen}
        onSuccess={() => refetchUsers()}
      />

      <CreateCompanyUserModal
        open={isCreateCompanyModalOpen}
        onOpenChange={setIsCreateCompanyModalOpen}
        onCreated={() => refetchUsers()}
      />

      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário {userToDelete?.first_name} {userToDelete?.last_name} será desativado e não poderá mais acessar o sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Desativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}