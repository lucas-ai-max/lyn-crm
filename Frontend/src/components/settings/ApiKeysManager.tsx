import { useState, useEffect } from "react";
import { useApiKeys, type CreateApiKeyResponse } from "@/hooks/useApiKeys";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Copy, RefreshCw, Trash2, Eye, EyeOff } from "lucide-react";

interface ApiKeysManagerProps {
  apiKey?: string;
}

export function ApiKeysManager({ apiKey }: ApiKeysManagerProps) {
  const { keys, loading, error, listKeys, createKey, regenerateKey, revokeKey } =
    useApiKeys();
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [showKeyDisplay, setShowKeyDisplay] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [keyToRevoke, setKeyToRevoke] = useState<string | null>(null);
  const [keyToRegenerate, setKeyToRegenerate] = useState<string | null>(null);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [regenerateKeyName, setRegenerateKeyName] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (apiKey) {
      loadKeys();
    }
  }, [apiKey]);

  const loadKeys = async () => {
    if (!apiKey) return;
    try {
      await listKeys(apiKey);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load API keys",
        variant: "destructive",
      });
    }
  };

  const handleCreateKey = async () => {
    if (!apiKey) return;
    try {
      const newKey = await createKey(apiKey, newKeyName || undefined);
      setShowKeyDisplay(newKey.key);
      setNewKeyName("");
      toast({
        title: "Success",
        description: "API key created. Copy it now - it won't be shown again!",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create API key",
        variant: "destructive",
      });
    } finally {
      setShowNewKeyDialog(false);
    }
  };

  const handleRegenerateKey = async () => {
    if (!apiKey || !keyToRegenerate) return;
    try {
      const newKey = await regenerateKey(apiKey, keyToRegenerate, regenerateKeyName);
      setShowKeyDisplay(newKey.key);
      setRegenerateKeyName("");
      setKeyToRegenerate(null);
      setShowRegenerateDialog(false);
      toast({
        title: "Success",
        description: "API key regenerated. Copy the new key now!",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to regenerate API key",
        variant: "destructive",
      });
    }
  };

  const handleRevokeKey = async () => {
    if (!apiKey || !keyToRevoke) return;
    try {
      await revokeKey(apiKey, keyToRevoke);
      setKeyToRevoke(null);
      toast({
        title: "Success",
        description: "API key revoked",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to revoke API key",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Manage API keys for programmatic access to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => setShowNewKeyDialog(true)} disabled={loading || !apiKey}>
            Create New API Key
          </Button>

          {error && <div className="text-sm text-red-600">{error}</div>}

          {showKeyDisplay && (
            <Dialog
              open={!!showKeyDisplay}
              onOpenChange={(open) => {
                if (!open) setShowKeyDisplay(null);
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Your API Key</DialogTitle>
                  <DialogDescription>
                    Copy this key now. You won't be able to see it again for security reasons.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded font-mono text-sm break-all">
                    {showKeyDisplay}
                  </div>
                  <Button
                    onClick={() => copyToClipboard(showKeyDisplay, "main")}
                    className="w-full"
                  >
                    {copiedId === "main" ? "Copied!" : "Copy Key"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          <div className="space-y-2">
            {keys.length === 0 ? (
              <p className="text-sm text-gray-500">No API keys created yet</p>
            ) : (
              <div className="space-y-2">
                {keys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{key.name}</p>
                      <p className="text-xs text-gray-500">
                        Created {new Date(key.created_at).toLocaleDateString()}
                        {key.last_used_at &&
                          ` • Used ${new Date(key.last_used_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setKeyToRegenerate(key.id);
                          setRegenerateKeyName(key.name);
                          setShowRegenerateDialog(true);
                        }}
                        disabled={loading}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setKeyToRevoke(key.id)}
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New API Key</DialogTitle>
            <DialogDescription>
              Give your API key a descriptive name
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="key-name">Key Name</Label>
              <Input
                id="key-name"
                placeholder="e.g., Production API"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>
            <Button onClick={handleCreateKey} disabled={loading} className="w-full">
              {loading ? "Creating..." : "Create Key"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate API Key</DialogTitle>
            <DialogDescription>
              A new key will be generated and the old one revoked
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="regen-key-name">Key Name</Label>
              <Input
                id="regen-key-name"
                placeholder="e.g., Production API"
                value={regenerateKeyName}
                onChange={(e) => setRegenerateKeyName(e.target.value)}
              />
            </div>
            <Button onClick={handleRegenerateKey} disabled={loading} className="w-full">
              {loading ? "Regenerating..." : "Regenerate Key"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!keyToRevoke} onOpenChange={(open) => !open && setKeyToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately revoke the API key. Any applications using it will stop
              working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeKey} className="bg-red-600">
              Revoke
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
