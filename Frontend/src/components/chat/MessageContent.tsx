import { useState } from "react";
import { Lock, FileText, Image as ImageIcon, Video, Music, File, ExternalLink } from "lucide-react";

interface MessageContentProps {
    content: string;
    mediaUrl?: string | null;
    mediaType?: string | null;
    direction: 'inbound' | 'outbound';
}

/**
 * Componente para renderizar conteúdo de mensagens com suporte a mídias
 * Suporta: imagem, vídeo, áudio, documento, sticker, viewOnce
 */
export function MessageContent({ content, mediaUrl, mediaType, direction }: MessageContentProps) {
    const [imageError, setImageError] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const [audioError, setAudioError] = useState(false);

    const isOutbound = direction === 'outbound';
    // Fix: Use inherit to respect bubble color (black/dark-gray), never white unless theme requires it
    const textColorClass = 'text-inherit';
    const mutedColorClass = 'text-inherit opacity-60';
    // Removed background from content inner to allow bubble to control it
    const bgClass = 'bg-transparent';



    // Placeholder para mídia expirada ou indisponível
    const MediaPlaceholder = ({ icon: Icon, label }: { icon: any; label: string }) => (
        <div className={`flex items-center gap-3 p-2 rounded-lg border border-black/10`}>
            <div className={`p-2 rounded-full bg-black/5`}>

                <Icon className={`h-5 w-5 ${mutedColorClass}`} />
            </div>
            <div className="flex-1">
                <p className={`text-sm font-medium ${textColorClass}`}>{label}</p>
                <p className={`text-xs ${mutedColorClass}`}>Mídia expirada ou indisponível</p>
            </div>
            {mediaUrl && (
                <a
                    href={mediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-2 rounded hover:${bgClass} transition-colors`}
                    title="Tentar abrir no navegador"
                >
                    <ExternalLink className={`h-4 w-4 ${mutedColorClass}`} />
                </a>
            )}
        </div>
    );

    // View Once - mostrar mensagem especial
    if (mediaType === 'viewOnce') {
        return (
            <div className={`flex items-center gap-2 ${mutedColorClass} italic`}>
                <Lock className="h-4 w-4" />
                <span>Abra no celular para ver</span>
            </div>
        );
    }

    // Imagem
    if (mediaType === 'image' && mediaUrl) {
        if (imageError) {
            return <MediaPlaceholder icon={ImageIcon} label="Imagem" />;
        }

        return (
            <div className="space-y-2">
                <img
                    src={mediaUrl}
                    alt="Imagem"
                    className="max-w-full max-h-[300px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity object-contain"
                    onClick={() => window.open(mediaUrl, '_blank')}
                    onError={() => setImageError(true)}
                />
                {content && !content.startsWith('[') && (
                    <p className={textColorClass}>{content}</p>
                )}
            </div>
        );
    }

    // Sticker (similar a imagem mas menor)
    if (mediaType === 'sticker' && mediaUrl) {
        if (imageError) {
            return <MediaPlaceholder icon={ImageIcon} label="Sticker" />;
        }

        return (
            <img
                src={mediaUrl}
                alt="Sticker"
                className="max-w-[150px] max-h-[150px] object-contain"
                onError={() => setImageError(true)}
            />
        );
    }

    // Vídeo
    if (mediaType === 'video' && mediaUrl) {
        if (videoError) {
            return <MediaPlaceholder icon={Video} label="Vídeo" />;
        }

        return (
            <div className="space-y-2">
                <video
                    controls
                    className="max-w-full max-h-[300px] rounded-lg"
                    preload="metadata"
                    onError={() => setVideoError(true)}
                >
                    <source src={mediaUrl} />
                    Seu navegador não suporta vídeos.
                </video>
                {content && !content.startsWith('[') && (
                    <p className={textColorClass}>{content}</p>
                )}
            </div>
        );
    }

    // Áudio
    if (mediaType === 'audio' && mediaUrl) {
        if (audioError) {
            return <MediaPlaceholder icon={Music} label="Áudio" />;
        }

        return (
            <div className="min-w-[200px]">
                <audio
                    controls
                    className="w-full h-10"
                    preload="metadata"
                    onError={() => setAudioError(true)}
                >
                    <source src={mediaUrl} />
                    Seu navegador não suporta áudios.
                </audio>
            </div>
        );
    }

    // Documento
    if (mediaType === 'document' && mediaUrl) {
        const fileName = content && !content.startsWith('[') ? content : 'Documento';
        const isPdf = mediaUrl.includes('.pdf') || content?.toLowerCase().includes('.pdf');

        return (
            <a
                href={mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 p-3 rounded-lg border ${isOutbound
                    ? 'border-primary-foreground/20 hover:bg-primary-foreground/10'
                    : 'border-border hover:bg-muted'
                    } transition-colors`}
            >
                <div className={`p-2 rounded ${isOutbound ? 'bg-primary-foreground/20' : 'bg-muted'}`}>
                    {isPdf ? (
                        <FileText className={`h-5 w-5 ${isOutbound ? 'text-primary-foreground' : 'text-red-500'}`} />
                    ) : (
                        <File className={`h-5 w-5 ${mutedColorClass}`} />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${textColorClass}`}>
                        {fileName}
                    </p>
                    <p className={`text-xs ${mutedColorClass}`}>
                        Clique para abrir
                    </p>
                </div>
            </a>
        );
    }

    // Mídia sem URL (placeholder) - mensagens antigas
    if (mediaType && !mediaUrl && mediaType !== 'conversation') {
        const iconMap: { [key: string]: any } = {
            image: ImageIcon,
            video: Video,
            audio: Music,
            document: FileText,
            sticker: ImageIcon,
        };
        const Icon = iconMap[mediaType] || File;
        const labelMap: { [key: string]: string } = {
            image: 'Imagem',
            video: 'Vídeo',
            audio: 'Áudio',
            document: 'Documento',
            sticker: 'Sticker',
        };

        return (

            <div className={`flex items-center gap-3 p-2 rounded-lg border border-black/10 opacity-70`}>
                <Icon className={`h-5 w-5 opacity-70`} />
                <span className={`text-sm`}>
                    {labelMap[mediaType] || 'Mídia'} não disponível
                </span>
            </div>
        );

    }

    // Texto simples
    return <p className={textColorClass}>{content}</p>;
}
