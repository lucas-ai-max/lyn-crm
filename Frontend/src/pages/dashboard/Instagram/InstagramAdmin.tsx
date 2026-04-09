import { useState, useEffect, SyntheticEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Instagram, Loader2, LinkIcon, Unlink, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  initiateInstagramConnection,
  getConnectedAccounts,
  deleteConnectedAccount,
} from "@/services/composio";

interface ConnectedAccount {
  id: string;
  status: string;
  createdAt: string;
  accountName?: string;
}

export default function InstagramAdmin() {
  const { user, companyId } = useAuth();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const cid = companyId || user?.id || "default";

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const data = await getConnectedAccounts(cid);
      const allAccounts = data?.items || [];
      setAccounts(allAccounts.map((a: any) => ({
        id: a.id,
        status: (a.status || "active").toLowerCase() === "active" ? "active" : a.status,
        createdAt: a.created_at || new Date().toISOString(),
        accountName: a.instagram_username ? `@${a.instagram_username}` : "Instagram Business",
      })));
    } catch (err: any) {
      console.error("Error fetching accounts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAccounts(); }, [cid]);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const result = await initiateInstagramConnection(cid);
      const redirectUrl = result?.redirect_url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        toast.error("Nao foi possivel gerar o link de conexao");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao conectar Instagram");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Desconectar esta conta do Instagram?")) return;
    try {
      await deleteConnectedAccount(cid);
      toast.success("Conta desconectada");
      fetchAccounts();
    } catch (err: any) {
      toast.error(err.message || "Erro ao desconectar");
    }
  };

  // Check if returning from OAuth callback
  useEffect(() => {
    const url = new URL(window.location.href);
    const status = url.searchParams.get("status");
    const error = url.searchParams.get("error");
    if (status) {
      if (status === "success") {
        toast.success("Conta conectada com sucesso!");
      } else if (status === "failed") {
        toast.error(error ? decodeURIComponent(error) : "Falha ao conectar conta do Instagram");
      }
      // Clean URL
      window.history.replaceState({}, "", url.pathname);
      fetchAccounts();
    }
  }, []);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-poppins">Instagram Admin</h1>
        <p className="text-muted-foreground">Conecte e gerencie sua conta do Instagram Business</p>
      </div>

      {/* Connected Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5" />
            Contas Conectadas
          </CardTitle>
          <CardDescription>
            Contas do Instagram Business vinculadas ao Lyn CRM
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : accounts.length > 0 ? (
            accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center gap-4 p-4 rounded-xl border bg-muted/30"
              >
                <img
                  src={`https://unavatar.io/instagram/${(account.accountName || "").replace("@", "")}`}
                  alt={account.accountName || "Instagram"}
                  onError={(e: SyntheticEvent<HTMLImageElement>) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextElementSibling?.classList.remove("hidden");
                  }}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center hidden">
                  <Instagram className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{account.accountName || "Instagram Business"}</p>
                  <p className="text-sm text-muted-foreground">
                    Conectado em {new Date(account.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {account.status === "active" ? "Ativo" : account.status}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnect}
                >
                  <Unlink className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
                <Instagram className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="font-medium">Nenhuma conta conectada</p>
                <p className="text-sm text-muted-foreground">
                  Conecte sua conta do Instagram Business para gerenciar DMs pelo Lyn CRM
                </p>
              </div>
            </div>
          )}

          <Button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 hover:from-purple-700 hover:via-pink-600 hover:to-orange-500 text-white"
          >
            {connecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <LinkIcon className="mr-2 h-4 w-4" />
                {accounts.length > 0 ? "Reconectar conta" : "Conectar Instagram"}
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Requer conta Instagram Business ou Creator.
          </p>
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como funciona</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground">1.</span>
              Clique em "Conectar Instagram" para autorizar via OAuth
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground">2.</span>
              Selecione sua conta Business/Creator no Instagram
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-foreground">3.</span>
              Suas DMs aparecerao na aba Instagram da Caixa de Entrada
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
