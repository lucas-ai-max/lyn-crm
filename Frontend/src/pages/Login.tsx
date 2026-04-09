import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signIn, loading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email, password);
  };

  return (
    <AuthLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-3 text-center">
          <h2 className="text-3xl font-semibold font-poppins text-foreground">
            Bem-vindo de volta
          </h2>
          <p className="text-muted-foreground font-poppins">
            Acesse sua conta para continuar
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-card border border-border rounded-lg p-8 shadow-lyn">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground font-poppins">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground font-poppins">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>

            <div className="text-center pt-2 space-y-4">
              <Link
                to="/forgot-password"
                className="block text-sm text-lyn-primary hover:text-lyn-primary-deep font-medium font-poppins transition-colors"
              >
                Esqueceu sua senha?
              </Link>

              <div className="text-sm text-muted-foreground">
                Não tem uma conta?{" "}
                <Link
                  to="/signup"
                  className="text-lyn-primary hover:text-lyn-primary-deep font-medium font-poppins transition-colors"
                >
                  Criar conta
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </AuthLayout>
  );
}
