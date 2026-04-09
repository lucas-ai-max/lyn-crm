import { cn } from "@/lib/utils";
import { MessageContent } from "./MessageContent";
import { CheckCheck, Check } from "lucide-react";
import "./Chat.css";

interface MessageBubbleProps {
    message: any; // Using any for now to match existing ChatInterface usage, ideally strictly typed later
    isGroup?: boolean;
    showDateSeparator?: boolean;
    dateLabel?: string;
    showUnreadDivider?: boolean;
}

export function MessageBubble({
    message,
    isGroup,
    showDateSeparator,
    dateLabel,
    showUnreadDivider
}: MessageBubbleProps) {
    const isOutbound = message.direction === 'outbound';

    // Status tick logic
    const renderTicks = () => {
        if (!isOutbound) return null;

        // Default to sent (single tick grey) if no status
        // If delivered -> double tick grey
        // If read -> double tick blue
        const status = message.status || 'sent';

        if (status === 'read') {
            return <CheckCheck className="tick-read" />;
        } else if (status === 'delivered') {
            return <CheckCheck className="tick-sent" />;
        } else {
            return <Check className="tick-sent" />;
        }
    };

    return (
        <>
            {showDateSeparator && (
                <div className="date-separator">
                    <span className="date-badge">{dateLabel}</span>
                </div>
            )}

            {showUnreadDivider && (
                <div className="unread-divider">
                    <span>Mensagens não lidas</span>
                </div>
            )}

            <div className={`message-group ${isOutbound ? 'items-end' : 'items-start'}`}>
                {/* Sender Name for Group Chats (Inbound) */}
                {isGroup && !isOutbound && message.sender?.name && (
                    <span className="text-[12px] text-muted-foreground ml-2 mb-0.5 font-medium">
                        {message.sender.name}
                    </span>
                )}

                <div className={cn(
                    "message-bubble",
                    isOutbound ? "sent" : "received"
                )}>
                    {/* Content */}
                    <MessageContent
                        content={message.content}
                        mediaUrl={message.media_url}
                        mediaType={message.media_type}
                        direction={message.direction}
                    />

                    {/* Metadata (Time + Ticks) */}
                    <div className="message-meta">
                        <span className="message-time">
                            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isOutbound && (
                            <span className="message-ticks">
                                {renderTicks()}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
