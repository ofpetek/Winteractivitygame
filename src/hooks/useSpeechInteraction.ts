import { useState, useEffect, useCallback, useRef } from 'react';
import { useVoiceSettings } from '../contexts/VoiceSettingsContext';
import { useVoiceLevel } from '../contexts/VoiceLevelContext';
import { AnswerEvaluationService } from '../services/AnswerEvaluationService';

interface UseSpeechInteractionProps {
  text: string;
  onRecognizedSpeech: (text: string) => void;
  expectedAnswer?: string;
  onEvaluated?: (result: { isCorrect: boolean; score: number; feedback: string; suggestion?: string }) => void;
  autoStart?: boolean;
}

export function useSpeechInteraction({
  text,
  onRecognizedSpeech,
  expectedAnswer,
  onEvaluated,
  autoStart = false
}: UseSpeechInteractionProps)
{
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [isGivingFeedback, setIsGivingFeedback] = useState(false);
  const { settings } = useVoiceSettings();
  const { setAudioLevel } = useVoiceLevel();
  const hasSpoken = useRef(false);
  const hasAnswered = useRef(false);
  const currentText = useRef(text);
  const currentExpectedAnswer = useRef(expectedAnswer);

  // Update refs when text or expectedAnswer change
  useEffect(() => {
    currentText.current = text;
    currentExpectedAnswer.current = expectedAnswer;
    hasAnswered.current = false;
    hasSpoken.current = false;
  }, [text, expectedAnswer]);

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
      // Skip if already answered
      if (hasAnswered.current) {
        return;
      }

      console.log('Processing audio...');
      
      // Check if audio is silent
      const audioContext = new AudioContext();
      const audioBuffer = await audioBlob.arrayBuffer();
      const buffer = await audioContext.decodeAudioData(audioBuffer);
      const channelData = buffer.getChannelData(0);
      
      // Calculate RMS of the audio
      let sumSquares = 0;
      for (let i = 0; i < channelData.length; i++) {
        sumSquares += channelData[i] * channelData[i];
      }
      const rms = Math.sqrt(sumSquares / channelData.length);
      
      console.log('RMS:', rms);
      if (rms < 0.03) {
        console.log('🔇 Audio is too silent, skipping evaluation');
        return;
      }

      // If we have an expected answer, evaluate it
      if (currentExpectedAnswer.current && onEvaluated) {
        const evaluationService = AnswerEvaluationService.getInstance();
        const result = await evaluationService.evaluateAnswer(
          audioBlob, 
          currentText.current, 
          currentExpectedAnswer.current
        );
        
        // Stop listening before giving feedback
        stopListening();
        hasAnswered.current = true;

        // Speak feedback
        const feedbackText = result.feedback + (result.suggestion ? ` ${result.suggestion}` : '');
        setFeedback(feedbackText);
        speakFeedback(feedbackText);
        
        // Call onEvaluated after starting feedback
        onEvaluated(result);
      }
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
    
    // Update global audio level (normalized between 0 and 1)
    const baseLevel = rms / 128;
    // If it's near silence, keep it very low
      // For normal speech, center around 0.3-0.7
      // Use exponential curve to make middle values more common
      const normalizedLevel = 0.1 + (Math.pow(baseLevel, 0.3) * 3);
      setAudioLevel(Math.min(normalizedLevel, 0.9));

    // Log audio level every 500ms to avoid console spam
    if (Date.now() % 500 < 50) {
      // console.log('🎤 Audio level (RMS):', rms.toFixed(2), 'Threshold:', settings.silenceThreshold);
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

  const speakFeedback = useCallback((feedbackText: string) => {
    if (!feedbackText) return;
    
    console.log('🗣️ Starting feedback speech:', feedbackText);
    setIsGivingFeedback(true);
    const utterance = new SpeechSynthesisUtterance(feedbackText);
    utterance.lang = settings.language || 'en-US';
    utterance.rate = settings.rate || 1;
    utterance.onend = () => {
      console.log('🎤 Feedback speech ended');
      setIsGivingFeedback(false);
    };
    window.speechSynthesis.speak(utterance);
  }, [settings.language, settings.rate]);

  useEffect(() => {
    console.log('🎭 Feedback state changed:', isGivingFeedback);
  }, [isGivingFeedback]);

  return {
    speak,
    isSpeaking,
    isListening,
    startListening,
    stopListening,
    feedback,
    isGivingFeedback,
    hasSpoken: hasSpoken.current
  };
}
