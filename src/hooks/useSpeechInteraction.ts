import { useState, useEffect, useCallback, useRef } from 'react';
import { useVoiceSettings } from '../contexts/VoiceSettingsContext';

interface UseSpeechInteractionProps {
  text: string;
  onRecognizedSpeech: (text: string) => void;
  autoStart?: boolean;
}

export function useSpeechInteraction({ 
  text, 
  onRecognizedSpeech,
  autoStart = true 
}: UseSpeechInteractionProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const { settings } = useVoiceSettings();
  const hasSpoken = useRef(false);

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const isListeningRef = useRef(false);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const processAudio = async (audioBlob: Blob) => {
    try {
      console.log('Processing audio...');
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        console.log('Audio data:', {
          mimeType: 'audio/wav',
          data: base64Audio
        });
      };
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Error processing audio:', error);
    }
  };

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log('⏹️ Stopping recording...');
      mediaRecorderRef.current.stop();
      setIsListening(false);
      isListeningRef.current = false;
      console.log('✅ Recording stopped');
    } else {
      console.log('ℹ️ No active recording to stop');
    }
  }, []);

  const detectSilence = useCallback((analyser: AnalyserNode) => {
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    // Calculate RMS value
    let sumSquares = 0;
    for (let i = 0; i < bufferLength; i++) {
      const value = dataArray[i] - 128;
      sumSquares += value * value;
    }
    const rms = Math.sqrt(sumSquares / bufferLength);
    
    // Log audio level every 500ms to avoid console spam
    if (Date.now() % 500 < 50) {
      console.log('🎤 Audio level (RMS):', rms.toFixed(2), 'Threshold:', settings.silenceThreshold);
    }

    if (rms < Math.abs(settings.silenceThreshold)) {
      if (silenceTimeoutRef.current === null) {
        console.log('🔇 Silence detected! Level:', rms.toFixed(2), 'below threshold:', settings.silenceThreshold);
        silenceTimeoutRef.current = setTimeout(() => {
          console.log('⏱️ Silence timeout reached. Stopping recording...');
          stopListening();
        }, 3000);
      }
    } else {
      if (silenceTimeoutRef.current) {
        console.log('🔊 Sound detected! Level:', rms.toFixed(2), 'above threshold:', settings.silenceThreshold);
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    }
  }, [settings.silenceThreshold, stopListening]);

  const startListening = useCallback(async () => {
    if (!isListening) {
      try {
        console.log('🎯 Starting audio recording...');
        console.log('🎤 Requesting microphone access...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { deviceId: settings.deviceId } 
        });
        console.log('✅ Microphone access granted');
        
        // Set up audio context and analyser
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        console.log('🔧 Audio context and analyser set up');
        
        // Configure analyser
        analyserRef.current.fftSize = 2048;
        analyserRef.current.minDecibels = -90;
        analyserRef.current.maxDecibels = -10;
        analyserRef.current.smoothingTimeConstant = 0.85;
        console.log('⚙️ Analyser configured:', {
          fftSize: analyserRef.current.fftSize,
          minDecibels: analyserRef.current.minDecibels,
          maxDecibels: analyserRef.current.maxDecibels
        });

        // Set up media recorder
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          console.log('📼 Audio chunk received:', event.data.size, 'bytes');
          audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          console.log('💾 Recording completed. Audio size:', audioBlob.size, 'bytes');
          await processAudio(audioBlob);
        };

        // Start recording
        mediaRecorderRef.current.start(1000); // Collect data every second
        setIsListening(true);
        isListeningRef.current = true;
        console.log('▶️ Recording started');

        // Start silence detection
        const checkSilence = () => {
          if (analyserRef.current && isListeningRef.current) {
            detectSilence(analyserRef.current);
            requestAnimationFrame(checkSilence);
          }
        };
        console.log('👂 Starting silence detection');
        requestAnimationFrame(checkSilence);

      } catch (error) {
        console.error('❌ Error during recording:', error);
      }
    } else {
      console.log('⚠️ Already listening, ignoring start request');
    }
  }, [isListening, settings.deviceId, detectSilence]);

  const speak = useCallback(() => {
    if (!isSpeaking && text) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = settings.language || 'en-US';
      utterance.rate = settings.rate || 1;
      utterance.pitch = settings.pitch || 1;
      utterance.volume = settings.volume || 1;

      utterance.onstart = () => {
        setIsSpeaking(true);
        hasSpoken.current = true;
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        if (autoStart) {
          startListening();
        }
      };

      window.speechSynthesis.speak(utterance);
    }
  }, [text, settings, isSpeaking, autoStart, startListening]);

  return {
    speak,
    isSpeaking,
    startListening,
    stopListening,
    isListening,
    hasSpoken: hasSpoken.current
  };
}
