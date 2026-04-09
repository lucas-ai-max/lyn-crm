import { Link } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export default function VerifyEmail() {
  return (
    <AuthLayout>
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-3">
            <Mail className="h-8 w-8 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-foreground">Verifique seu e-mail</h2>
          <p className="text-muted-foreground">
            Enviamos um link de confirmação para o seu e-mail.
            <br />
            Clique no link para ativar sua conta.
          </p>
        </div>

        <div className="space-y-4 pt-4">
          <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">Não recebeu o e-mail?</p>
            <p>Verifique sua caixa de spam ou aguarde alguns minutos.</p>
          </div>

          <Link to="/login">
            <Button className="w-full" size="lg">
              Já confirmei, fazer login
            </Button>
          </Link>

          <Link
            to="/signup"
            className="block text-sm text-[hsl(var(--accent))] hover:underline"
          >
            Voltar para cadastro
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
