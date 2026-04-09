import { ReactNode } from "react";
import { LynLogo } from "@/components/LynLogo";

interface AuthLayoutProps {
  children: ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Side - Branding com gradiente vibrante */}
      <div className="hidden lg:flex flex-col items-center justify-center bg-gradient-to-br from-lyn-primary via-purple-soft to-lyn-accent text-white p-12 relative overflow-hidden">
        {/* Pattern decorativo de fundo */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 space-y-8 max-w-lg">
          {/* Logo grande e visível - usando logo clara no fundo roxo */}
          <div className="flex items-center justify-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <LynLogo variant="symbol" className="h-32 w-32 drop-shadow-2xl" />
          </div>

          {/* Título e descrição */}
          <div className="space-y-4 text-center">
            <h1 className="text-5xl font-semibold font-poppins leading-tight">Lyn CRM</h1>
            <div className="h-1 w-24 bg-white/40 mx-auto rounded-full" />
            <p className="text-xl text-white/95 font-poppins font-light leading-relaxed">
              Gestão inteligente de leads com automação e IA
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
};
