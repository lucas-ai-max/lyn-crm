import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Signup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { signUp, createProfile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Senhas divergentes",
        description: "As senhas não conferem.",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Senha fraca",
        description: "A senha deve ter no mínimo 6 caracteres.",
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Criar usuário no Auth
      const { error: signUpError } = await signUp(email, password);

      if (signUpError) {
        // O erro já é tratado no contexto
        setLoading(false);
        return;
      }

      // IMPORTANTE: Devido ao fluxo de confirmação de email, o usuário pode não estar logado imediatamente.
      // Se o email confirmation estiver DESLIGADO no Supabase, o usuário estará logado e poderemos criar o profile.
      // Se estiver LIGADO, não conseguiremos criar o profile agora (pois requer autenticação).
      // Vamos assumir que o usuário precisa criar a conta e depois pode completar o perfil, 
      // OU tentamos criar o perfil imediatamente se a sessão for estabelecida.

      // OBS: O método signUp do AuthContext já redireciona para /verify-email se sucesso.
      // Porém, para o fluxo self-service funcionar completo, deveríamos tentar criar o profile se possível.
      // O AuthContext atual redireciona muito rápido.

      // Para este MVP, vamos considerar que o usuário cria a conta e recebe o aviso.
      // Mas o requisito pede para salvar o nome da empresa.
      // Se o usuário não está autenticado, não pode escrever na tabela Company/Profiles (RLS).
      // Solução: Adicionar metadata no signUp ou usar um Edge Function.
      // Como estamos limitados ao client-side neste momento e o auth.ts foi alterado para criar company/profile,
      // precisamos estar logados.

      // Se o email confirm estiver ON, este passo falhará se tentarmos imediatamente.
      // Vamos tentar passar os dados via metadata no signUp (TODO: refatorar depois se possível)
      // OU esperar o sign in.

      // Assumindo que o signUp do Supabase retorna sessão (Auto Confirm ON ou Localhost),
      // o AuthContext atualiza o user e session.

      // Porem, se o signUp do context redirecionar, perdemos a chance.
      // Vamos usar apenas o authService diretamente aqui? Não, useAuth é melhor.
      // Mas o `signUp` do useAuth é void ou retorna error, e faz redirect.

      // Vou ajustar a estratégia: O usuário cria a conta. 
      // Se o Supabase exigir confirmação, não conseguiremos criar a empresa AGORA.
      // Mas podemos instruir o usuário.

      // ALTERNATIVA: Se o usuário já estiver logado (ex: auto confirm), chamamos createProfile.
      // Vamos tentar:

      // O `signUp` do AuthContext chama o `authService.signUp`.
      // Vamos ver se conseguimos interceptar ou usar o user recém criado.

      // ... Olhando o AuthContext, ele redireciona após 1.5s.
      // Isso pode ser um problema se quisermos criar o perfil *antes*.

      // Vamos modificar um pouco a lógica. O `signUp` do AuthContext é simples.
      // Vou usar o `authService` diretamente aqui ou confiar que o usuário completará depois?
      // "O usuário deve preencher...".

      // Se eu não criar a empresa agora, perdemos os dados.
      // Vou tentar criar o profile logo após, assumindo que pode haver uma sessão.
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSmartSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ variant: "destructive", title: "Erro", description: "Senhas não conferem." });
      return;
    }

    setLoading(true);

    // Usando auth service diretamente para ter controle
    // Mas precisamos da função de criar profile exposta pelo context ou service.
    // O context expõe `createProfile`.

    // 1. SignUp with Metadata
    const { error: signUpError } = await signUp(email, password, {
      first_name: firstName,
      last_name: lastName,
      company_name: companyName
    });

    if (signUpError) {
      setLoading(false);
      return;
    }

    // A criação do profile/company é feita automaticamente via Trigger no banco de dados.
    // O auth context vai redirecionar.

    // O auth context vai redirecionar.
  };

  return (
    <AuthLayout>
      <div className="space-y-8">
        <div className="space-y-3 text-center">
          <h2 className="text-3xl font-semibold font-poppins text-foreground">
            Crie sua conta
          </h2>
          <p className="text-muted-foreground font-poppins">
            Comece a usar o Lyn CRM hoje mesmo
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-8 shadow-lyn">
          <form onSubmit={handleSmartSignup} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nome</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Seu nome"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Sobrenome</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Seu sobrenome"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? "Criando conta..." : "Criar conta"}
            </Button>

            <div className="text-center pt-2">
              <p className="text-sm text-muted-foreground">
                Já tem uma conta?{" "}
                <Link
                  to="/login"
                  className="text-lyn-primary hover:text-lyn-primary-deep font-medium font-poppins transition-colors"
                >
                  Entrar
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </AuthLayout>
  );
}
