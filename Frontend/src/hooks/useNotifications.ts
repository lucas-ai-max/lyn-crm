import { useState, useEffect, useCallback } from 'react';

// Short notification beep sound (base64 encoded WAV)
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJibmZuQg350cWxrb4KfpqGWiHttZWRmdJmwoJWGdmxkZGZzlqugjod5cGdkZ3SUqJ+OhXlwZ2VodpSnn42Ee3JramyAkaKai4N5cWpqb4KYo5eFgHdubXR9jZqWi4J5cW5ydn+Rn5aCe3dzdHh+ipSShX55dnV3fYaQkoR+enZ2eH2FjpCDfXp2d3h9hI2PgXx5d3d4fIOLjn99eXd3eHyCio1+fHh3d3h8gYmMfXt4d3d4e4CHinx7eHd3eHp/hol7enh3d3d5foWHeXl4d3d3eH2Ehr93eHd3d3h8gYV+dnl3d3d3e4CDfXd4d3d3d3p/gnt4eHZ3d3d6fn96eHd3d3d3fIB9eXh4d3d3enx/fHl4d3d3d3p8fnt4eHd3d3d6fH15eHh3d3d3enx8eXh4d3d3d3p8e3l4eHd3d3d6fHt5eHh3d3d3ent7eXh4d3d3d3p7e3l4eHd3d3d6e3t5eHh3d3d3ent7eXh4d3d3d3p7enl5eHd3d3d6e3p5eXh3d3d3ent6eXl4d3d3eHl7enl5eHd3d3h5e3p5eXh3d3d4eXt6eXl4d3d3eHl7enl5eHd3d3h5e3p5eHh3d3d4eXt6eXh4d3d3eHl7enh4eHd3d3h5e3p4eHh3d3d4eHZ2d3d3d3d4eHZ2d3d3d3d4d3Z2d3d3d3d4d3Z2d3d3d3d3dnZ3d3d3d3d3dnZ3d3d3d3d3dnd3d3d3d3d3dnd3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3Z2d3d3d3d3d3Z2d3d3d3d3dnZ3d3d3d3d3dnZ3d3d3d3d3dnd3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3';

export function useNotifications() {
    const [permission, setPermission] = useState<NotificationPermission>(
        typeof Notification !== 'undefined' ? Notification.permission : 'denied'
    );

    // Request permission on first user interaction
    const requestPermission = useCallback(async () => {
        if (typeof Notification === 'undefined') return;

        try {
            const result = await Notification.requestPermission();
            setPermission(result);
        } catch (error) {
            console.error('Failed to request notification permission:', error);
        }
    }, []);

    // Auto-request on mount if not decided
    useEffect(() => {
        if (permission === 'default') {
            // We'll request on first interaction instead of automatically
            const handleInteraction = () => {
                requestPermission();
                document.removeEventListener('click', handleInteraction);
            };
            document.addEventListener('click', handleInteraction);
            return () => document.removeEventListener('click', handleInteraction);
        }
    }, [permission, requestPermission]);

    const playSound = useCallback(() => {
        try {
            const audio = new Audio(NOTIFICATION_SOUND);
            audio.volume = 0.5;
            audio.play().catch(e => console.log('Audio play failed:', e));
        } catch (error) {
            console.error('Failed to play notification sound:', error);
        }
    }, []);

    const notify = useCallback((title: string, body: string, options?: { silent?: boolean }) => {
        // Always try to play sound (unless silent)
        if (!options?.silent) {
            playSound();
        }

        // Show browser notification if permitted
        if (permission === 'granted' && typeof Notification !== 'undefined') {
            try {
                new Notification(title, {
                    body,
                    icon: '/logo-lyn.png',
                    tag: 'lyn-notification', // Prevent duplicate notifications
                    silent: true // We handle sound ourselves
                });
            } catch (error) {
                console.error('Failed to show notification:', error);
            }
        }
    }, [permission, playSound]);

    return {
        notify,
        requestPermission,
        permission,
        isSupported: typeof Notification !== 'undefined'
    };
}
