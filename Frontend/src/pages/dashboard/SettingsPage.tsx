import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useRole } from '@/hooks/useRole';
import { useCompanyApiKeyBootstrap } from '@/hooks/useCompanyApiKeyBootstrap';
import { useCompany } from '@/hooks/useCompany';
import { CompanySettingsForm } from '@/components/settings/CompanySettingsForm';
import { QuickRepliesSettings } from '@/components/settings/QuickRepliesSettings';
import { FacebookLeadsSettings } from '@/components/settings/FacebookLeadsSettings';
import { ApiKeysManager } from '@/components/settings/ApiKeysManager';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Copy, Check } from 'lucide-react';

const profileSchema = z.object({
  first_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(50),
  last_name: z.string().min(2, 'Sobrenome deve ter pelo menos 2 caracteres').max(50),
  avatar_url: z.string().url('URL inválida').optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  updated_at: string | null;
}

export default function SettingsPage() {
  const { user, profile: authProfile } = useAuth();
  const { role, isLoading: roleLoading } = useRole();
  const { data: companyData } = useCompany();
  const { apiKey, hasKeys, needsReentry, isLoading: bootstrapLoading, createFirstKey } = useCompanyApiKeyBootstrap();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    }
  }, [user?.id]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lyn_profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      setProfile(data as any);
      reset({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        avatar_url: data.avatar_url || '',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar perfil',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmitProfile = async (data: ProfileFormData) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('lyn_profiles')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          avatar_url: data.avatar_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;

      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram salvas com sucesso.',
      });

      fetchProfile();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const userInitials = profile
    ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`
    : 'U';

  return (
    <div className="space-y-6 font-poppins">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie suas informações pessoais e da empresa
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full max-w-xl grid-cols-5">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="company">Empresa</TabsTrigger>
          <TabsTrigger value="quick_replies">Respostas</TabsTrigger>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card className="shadow-lyn">
            <CardHeader>
              <CardTitle>Informações do Perfil</CardTitle>
              <CardDescription>
                Atualize suas informações pessoais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmitProfile)} className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile?.avatar_url || ''} />
                    <AvatarFallback className="text-lg bg-lyn-primary-light/20 text-lyn-primary font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Label htmlFor="avatar_url">URL do Avatar</Label>
                    <Input
                      id="avatar_url"
                      placeholder="https://exemplo.com/avatar.jpg"
                      {...register('avatar_url')}
                    />
                    {errors.avatar_url && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.avatar_url.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Nome</Label>
                    <Input
                      id="first_name"
                      placeholder="João"
                      {...register('first_name')}
                    />
                    {errors.first_name && (
                      <p className="text-sm text-destructive">
                        {errors.first_name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="last_name">Sobrenome</Label>
                    <Input
                      id="last_name"
                      placeholder="Silva"
                      {...register('last_name')}
                    />
                    {errors.last_name && (
                      <p className="text-sm text-destructive">
                        {errors.last_name.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input value={user?.email || ''} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">
                    O e-mail não pode ser alterado
                  </p>
                </div>

                {role && (
                  <div className="space-y-2">
                    <Label>Nível de Acesso</Label>
                    <Input
                      value={
                        role === 'superadmin' ? 'Super Administrador' :
                          role === 'admin' ? 'Administrador' : 'Usuário'
                      }
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Seu nível de acesso define as permissões na plataforma
                    </p>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="mt-6">
          <CompanySettingsForm />
        </TabsContent>

        <TabsContent value="quick_replies" className="mt-6">
          <QuickRepliesSettings />
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <div className="space-y-6">
            <FacebookLeadsSettings />
          </div>
        </TabsContent>

        <TabsContent value="api" className="mt-6">
          <div className="space-y-6">
            {/* API Keys Section */}
            {(role === 'admin' || role === 'superadmin') && (
              <Card className="shadow-lyn">
                <CardHeader>
                  <CardTitle>Chaves de API</CardTitle>
                  <CardDescription>
                    Gerencie suas chaves de API para integração programática
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {bootstrapLoading ? (
                    <div className="flex items-center justify-center min-h-[200px]">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : needsReentry ? (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Sua empresa possui chaves de API, mas você precisa criar uma nova para acessá-la nesta sessão.
                      </p>
                      <Button onClick={createFirstKey} disabled={bootstrapLoading}>
                        {bootstrapLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Criar Nova Chave
                      </Button>
                    </div>
                  ) : apiKey ? (
                    <div className="space-y-4">
                      <ApiKeysManager apiKey={apiKey} />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Nenhuma chave de API encontrada. Crie a primeira chave para começar.
                      </p>
                      <Button onClick={createFirstKey} disabled={bootstrapLoading}>
                        {bootstrapLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Criar Primeira Chave
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Integration IDs Section */}
            <Card className="shadow-lyn">
              <CardHeader>
                <CardTitle>IDs de Integração</CardTitle>
                <CardDescription>
                  Identificadores da sua empresa para integração com serviços externos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Instagram Page ID */}
                  <div className="space-y-2">
                    <Label>Instagram Page ID</Label>
                    <div className="flex gap-2">
                      <Input
                        value={companyData?.instagram_page_id || ''}
                        disabled
                        className="bg-muted font-mono text-sm"
                        placeholder="Não configurado"
                      />
                      {companyData?.instagram_page_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(companyData.instagram_page_id);
                            setCopiedId('instagram');
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                        >
                          {copiedId === 'instagram' ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Composio Entity ID */}
                  <div className="space-y-2">
                    <Label>Composio Entity ID</Label>
                    <div className="flex gap-2">
                      <Input
                        value={companyData?.composio_entity_id || ''}
                        disabled
                        className="bg-muted font-mono text-sm"
                        placeholder="Não configurado"
                      />
                      {companyData?.composio_entity_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(companyData.composio_entity_id);
                            setCopiedId('composio');
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                        >
                          {copiedId === 'composio' ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-4">
                    Esses IDs são gerados automaticamente quando você conecta seus serviços. Entre em contato com o suporte para configurar integrações.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
