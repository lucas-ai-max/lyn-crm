import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Check, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AudioRecorderProps = {
  onRecordingComplete: (audioBlob: Blob) => void;
  onCancel: () => void;
};

export function AudioRecorder({ onRecordingComplete, onCancel }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setRecordedBlob(audioBlob);
        // Stop all tracks in the stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setElapsedTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleRetry = () => {
    setRecordedBlob(null);
    audioChunksRef.current = [];
    setElapsedTime(0);
  };

  const handleSend = () => {
    if (recordedBlob) {
      onRecordingComplete(recordedBlob);
    }
  };

  // Start recording on mount and clean up on unmount
  useEffect(() => {
    // Start recording automatically when component mounts
    const startRecordingOnMount = async () => {
      if (!isRecording && !recordedBlob) {
        await startRecording();
      }
    };
    
    startRecordingOnMount();
    
    // Clean up on unmount
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="p-4 bg-muted/40 rounded-lg w-full max-w-md">
      {!recordedBlob ? (
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-destructive/20 animate-ping"></div>
              <Mic className="h-8 w-8 text-destructive" />
            </div>
          </div>
          
          <div className="text-center">
            <p className="font-medium">Gravando...</p>
            <p className="text-muted-foreground text-sm">
              {formatTime(elapsedTime)}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={stopRecording}
              className="gap-2"
            >
              <Square className="h-4 w-4" />
              Parar gravação
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <audio
              src={URL.createObjectURL(recordedBlob)}
              controls
              className="w-full"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleRetry}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Regravar
            </Button>
            <Button
              type="button"
              onClick={handleSend}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              Enviar áudio
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
