import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function AIInsightsCard() {
  return (
    <Card className="shadow-lyn">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 font-poppins text-lyn-primary">
          <Sparkles className="h-5 w-5 text-lyn-primary" />
          Insights da IA
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          disabled
          className="font-poppins"
        >
          Em breve
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-8">
          <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50 text-lyn-primary/50" />
          <p className="text-sm text-texto-secundario mb-4 font-poppins">
            Insights inteligentes em desenvolvimento.
          </p>
          <p className="text-xs text-texto-secundario font-poppins">
            Em breve você terá análises automáticas das suas conversas e sugestões personalizadas.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
