
import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface TranscriptionResponse {
  text: string;
}

const App = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [useCustomModel, setUseCustomModel] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  const startRecording = () => {
    if (!stream) return;

    chunksRef.current = [];
    mediaRecorderRef.current = new MediaRecorder(stream);

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      await sendAudioToBackend(audioBlob);
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudioToBackend = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('model', useCustomModel ? 'custom' : 'whisper-small');

      const response = await fetch('http://localhost:3001/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const data: TranscriptionResponse = await response.json();
      setTranscript(data.text);
    } catch (error) {
      console.error('Error sending audio to backend:', error);
      setTranscript('Error transcribing audio');
    } finally {
      setIsProcessing(false);
    }
  };

  React.useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="container mx-auto p-4">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Speech to Text Converter</CardTitle>
          <div className="flex items-center space-x-2">
            <Switch
              checked={useCustomModel}
              onCheckedChange={setUseCustomModel}
              id="model-switch"
            />
            <Label htmlFor="model-switch">
              Use Custom Model: {useCustomModel ? 'Yes' : 'No'}
            </Label>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="flex justify-center">
              <Button
                variant={isRecording ? "destructive" : "default"}
                onClick={isRecording ? stopRecording : startRecording}
                className="w-32"
                disabled={isProcessing}
              >
                {isRecording ? 'Stop' : 'Record'}
              </Button>
            </div>

            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Transcript:</h3>
              <div className="p-4 rounded-lg bg-gray-50 min-h-[100px]">
                {isProcessing ? 'Processing...' : (transcript || 'Transcript will appear here...')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default App;