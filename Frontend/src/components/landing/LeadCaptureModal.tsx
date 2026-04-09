import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface LeadCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LeadCaptureModal = ({ open, onOpenChange }: LeadCaptureModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    telefone_2: "",
    empresa: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome || !formData.email || !formData.telefone) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("lyn_leads").insert({
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone,
        telefone_2: formData.telefone_2 || null,
        empresa: formData.empresa || null,
        status: "Novos",
        company_id: "041c7171-f0a1-4028-b414-58cab2c343d8",
        responsavel_id: "03ced14f-6f43-479d-b6ca-7dfcf442dcd0"
      });

      if (error) throw error;

      toast.success("Obrigado! Entraremos em contato em breve.");
      setFormData({ nome: "", email: "", telefone: "", telefone_2: "", empresa: "" });
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating lead:", error);
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw] max-h-[90vh] flex flex-col overflow-y-auto">
        <DialogHeader className="bg-gradient-to-r from-primary to-accent p-6 -m-6 mb-0 rounded-t-lg">
          <DialogTitle className="text-2xl text-primary-foreground text-center">
            Quer saber mais?
          </DialogTitle>
          <DialogDescription className="text-primary-foreground/90 text-center">
            Deixe seus dados e entraremos em contato
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 min-h-0 flex-col gap-4 pt-4">
          <div className="flex-1 min-h-0 space-y-4 overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Seu nome"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Endereço de e-mail *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="seu@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone 1 - WhatsApp *</Label>
              <Input
                id="telefone"
                type="tel"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="+55 11 99999-9999"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone_2">Telefone 2 (Opcional)</Label>
              <Input
                id="telefone_2"
                type="tel"
                value={formData.telefone_2}
                onChange={(e) => setFormData({ ...formData, telefone_2: e.target.value })}
                placeholder="+55 11 99999-9999"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="empresa">Nome da empresa</Label>
              <Input
                id="empresa"
                value={formData.empresa}
                onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                placeholder="Sua empresa"
              />
            </div>
          </div>

          <div className="flex-shrink-0 border-t border-border pt-4">
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
