import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Settings, Building2, Mail, User } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export function UserProfileCard() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const { company } = useCompany();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="shadow-lyn rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg font-poppins font-semibold">Perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const initials = profile?.first_name && profile?.last_name
    ? `${profile.first_name[0]}${profile.last_name[0]}`
    : profile?.first_name?.[0] || "U";

  return (
    <Card className="shadow-lyn rounded-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-poppins font-semibold">Perfil</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard/settings")}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-16 w-16 border-2 border-lyn-primary/20">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="text-lg font-poppins bg-lyn-primary/10 text-lyn-primary">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-poppins font-semibold text-lg text-texto dark:text-foreground">
              {profile?.first_name} {profile?.last_name}
            </h3>
            <p className="text-sm font-poppins text-texto-secundario dark:text-muted-foreground capitalize">
              {profile?.role || "Usuário"}
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 text-lyn-primary" />
            <span className="font-poppins text-texto-secundario dark:text-muted-foreground truncate">{user?.email}</span>
          </div>
          
          {company?.name && (
            <div className="flex items-center gap-3 text-sm">
              <Building2 className="h-4 w-4 text-lyn-primary" />
              <span className="font-poppins text-texto-secundario dark:text-muted-foreground">{company.name}</span>
            </div>
          )}

          <div className="flex items-center gap-3 text-sm">
            <User className="h-4 w-4 text-lyn-primary" />
            <span className="font-poppins text-texto-secundario dark:text-muted-foreground">
              Membro desde {new Date(profile?.created_at || "").toLocaleDateString()}
            </span>
          </div>
        </div>

        <Button 
          variant="outline" 
          className="w-full mt-4 font-poppins border-lyn-primary text-lyn-primary hover:bg-lyn-primary/10"
          onClick={() => navigate("/dashboard/settings")}
        >
          Editar perfil
        </Button>
      </CardContent>
    </Card>
  );
}
