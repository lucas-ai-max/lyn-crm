import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Building2, ArrowRight, Loader2 } from 'lucide-react';

export default function OnboardingPage() {
    const [companyName, setCompanyName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { user, companyId } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    // Redirect if already has company
    if (companyId) {
        // Determine where to go - usually dashboard
        window.location.href = '/dashboard';
        return null;
    }

    const handleCreateCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!companyName.trim() || !user) return;

        setIsLoading(true);
        try {
            // 1. Create the company
            const { data: company, error: companyError } = await supabase
                .from("lyn_company")
                .insert({ name: companyName.trim(), owner_id: user.id })
                .select()
                .single();

            if (companyError) throw companyError;

            // 2. Link the profile to the company
            const { error: profileError } = await supabase
                .from("lyn_profiles")
                .update({ company_id: company.id, role: 'admin' })
                .eq('id', user.id);

            if (profileError) throw profileError;

            // 3. Create default pipeline with stages
            const { data: pipeline, error: pipelineError } = await supabase
                .from("lyn_pipelines")
                .insert({
                    company_id: company.id,
                    name: "Funil Principal",
                    is_default: true,
                    is_active: true,
                    position: 0,
                    created_by: user.id,
                })
                .select()
                .single();

            if (pipelineError) throw pipelineError;

            const defaultStages = [
                { name: "Novos", color: "#1A73E8", position: 0 },
                { name: "Qualificação", color: "#5FC1F8", position: 1 },
                { name: "Negociação", color: "#F26526", position: 2 },
                { name: "Proposta", color: "#FFA040", position: 3 },
                { name: "Fechado", color: "#34D399", position: 4, is_final: true },
            ];

            const { error: stagesError } = await supabase
                .from("lyn_pipeline_stages")
                .insert(
                    defaultStages.map((s) => ({
                        pipeline_id: pipeline.id,
                        company_id: company.id,
                        name: s.name,
                        color: s.color,
                        position: s.position,
                        is_active: true,
                        is_final: s.is_final || false,
                    }))
                );

            if (stagesError) throw stagesError;

            toast({
                title: "Tudo pronto!",
                description: "Sua empresa e funil foram criados com sucesso.",
            });

            await supabase.auth.refreshSession();

            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 500);

        } catch (error: any) {
            console.error('Error creating company:', error);
            toast({
                variant: "destructive",
                title: "Erro ao criar empresa",
                description: error.message || "Tente novamente mais tarde.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            {/* Left Panel - Hero */}
            <div className="hidden lg:flex flex-col bg-zinc-900 border-r border-white/10 p-12 text-white">
                <div className="flex items-center gap-2 mb-12">
                    <div className="h-8 w-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-bold text-xl tracking-tight">Lyn CRM</span>
                </div>

                <div className="mt-auto space-y-6 max-w-lg">
                    <h1 className="text-4xl font-bold font-display leading-tight">
                        Bem-vindo ao seu novo espaço de trabalho.
                    </h1>
                    <p className="text-zinc-400 text-lg leading-relaxed">
                        Para começar, precisamos configurar sua organização. Isso permitirá que você convide sua equipe e gerencie seus projetos.
                    </p>
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className="flex items-center justify-center p-8 bg-zinc-950">
                <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="text-2xl text-white">Vamos começar</CardTitle>
                        <CardDescription className="text-zinc-400">
                            Qual é o nome da sua empresa?
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateCompany} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="companyName" className="text-zinc-300">Nome da Empresa</Label>
                                <Input
                                    id="companyName"
                                    placeholder="Ex: Acme Inc."
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-indigo-500 transition-colors"
                                    required
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white transition-all h-11"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Configurando...
                                    </>
                                ) : (
                                    <>
                                        Continuar
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
