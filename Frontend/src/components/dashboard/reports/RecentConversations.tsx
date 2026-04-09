import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Conversation {
  id: string;
  leadId: string;
  leadName: string;
  empresa: string;
  lastMessage: string;
  timestamp: string;
  status: string;
}

interface RecentConversationsProps {
  conversations: Conversation[];
  onConversationClick: (id: string) => void;
}

export function RecentConversations({ conversations, onConversationClick }: RecentConversationsProps) {
  return (
    <Card className="shadow-lyn">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-poppins text-lyn-primary">
          <MessageSquare className="h-5 w-5 text-lyn-primary" />
          Conversas Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {conversations.length === 0 ? (
            <p className="text-sm text-texto-secundario text-center py-8 font-poppins">
              Nenhuma conversa recente
            </p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-lyn-primary-light/10 cursor-pointer transition-colors border border-transparent hover:border-lyn-primary/20"
                onClick={() => onConversationClick(conv.id)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-lyn-primary/10 text-lyn-primary font-poppins">
                    {conv.leadName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-sm font-poppins text-lyn-primary">{conv.leadName}</p>
                    <span className="text-xs text-texto-secundario font-poppins">
                      {formatDistanceToNow(new Date(conv.timestamp), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-texto-secundario mb-1 font-poppins">{conv.empresa}</p>
                  <p className="text-sm text-texto-secundario truncate font-poppins">{conv.lastMessage}</p>
                </div>
                <Badge variant="secondary" className="text-xs font-poppins bg-lyn-primary-light text-lyn-primary-deep">
                  {conv.status}
                </Badge>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
