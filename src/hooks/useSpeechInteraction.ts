import { useState, useCallback, useEffect, useRef } from 'react';
import { useVoiceSettings } from '../contexts/VoiceSettingsContext';
import { SpeechManager } from '../services/SpeechManager';
import { AudioRecordingManager, AudioRecordingOptions } from '../services/AudioRecordingManager';
import { SilenceDetector } from '../utils/SilenceDetector';
import { AudioTranscriptionService } from '../services/AudioTranscriptionService';

interface UseSpeechInteractionProps {
  text: string;
  onRecognizedSpeech: (text: string) => void;
  autoStart?: boolean;
}

interface SpeechState {
  isSpeaking: boolean;
  isListening: boolean;
  error: Error | null;
}

type SpeechAction = 
  | { type: 'START_SPEAKING' }
  | { type: 'STOP_SPEAKING' }
  | { type: 'START_LISTENING' }
  | { type: 'STOP_LISTENING' }
  | { type: 'SET_ERROR'; error: Error };

export function useSpeechInteraction({ 
  text, 
  onRecognizedSpeech,
  autoStart = true 
}: UseSpeechInteractionProps) {
  const [state, setState] = useState<SpeechState>({
    isSpeaking: false,
    isListening: false,
    error: null
  });

  const { settings } = useVoiceSettings();
  const hasInitialized = useRef(false);
  const currentTextRef = useRef(text);
  const isUnmountedRef = useRef(false);
  
  // Initialize services
  const speechManager = SpeechManager.getInstance();
  const recordingManager = new AudioRecordingManager();
  const transcriptionService = AudioTranscriptionService.getInstance();
  const silenceDetector = new SilenceDetector({
    threshold: settings.silenceThreshold,
    silenceDuration: 2000,
    onSilenceThresholdReached: () => {
      if (!isUnmountedRef.current) {
        recordingManager.stopRecording();
        dispatch({ type: 'STOP_LISTENING' });
      }
    }
  });

  // State management
  const dispatch = useCallback((action: SpeechAction) => {
    if (!isUnmountedRef.current) {
      setState(prevState => {
        switch (action.type) {
          case 'START_SPEAKING':
            return { ...prevState, isSpeaking: true, error: null };
          case 'STOP_SPEAKING':
            return { ...prevState, isSpeaking: false };
          case 'START_LISTENING':
            return { ...prevState, isListening: true, error: null };
          case 'STOP_LISTENING':
            return { ...prevState, isListening: false };
          case 'SET_ERROR':
            return { ...prevState, error: action.error, isSpeaking: false, isListening: false };
          default:
            return prevState;
        }
      });
    }
  }, []);

  // Handle transcription result
  const handleTranscriptionResult = useCallback(async (audioBlob: Blob) => {
    if (!isUnmountedRef.current) {
      try {
        const transcribedText = await transcriptionService.transcribe(audioBlob);
        onRecognizedSpeech(transcribedText);
      } catch (error) {
        dispatch({ type: 'SET_ERROR', error: error as Error });
      }
    }
  }, [onRecognizedSpeech, dispatch]);

  // Start listening for audio
  const startListening = useCallback(async () => {
    if (isUnmountedRef.current) return;

    try {
      const recordingOptions: AudioRecordingOptions = {
        deviceId: settings.deviceId,
        onStart: () => dispatch({ type: 'START_LISTENING' }),
        onStop: () => dispatch({ type: 'STOP_LISTENING' }),
        onDataAvailable: (blob) => {
          if (blob.size > 0) {
            handleTranscriptionResult(blob);
          }
        },
        onError: (error) => dispatch({ type: 'SET_ERROR', error })
      };

      await recordingManager.startRecording(recordingOptions);

      if (recordingManager.isRecording()) {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { deviceId: settings.deviceId } 
        });
        await silenceDetector.start(stream);
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', error: error as Error });
    }
  }, [settings.deviceId, handleTranscriptionResult, dispatch]);

  // Speak the text
  const speak = useCallback(async () => {
    if (state.isSpeaking || isUnmountedRef.current) {
      return;
    }

    try {
      dispatch({ type: 'START_SPEAKING' });
      await speechManager.speak(text);
      
      if (!isUnmountedRef.current) {
        dispatch({ type: 'STOP_SPEAKING' });
        await startListening();
      }
    } catch (error) {
      if (!isUnmountedRef.current) {
        dispatch({ type: 'SET_ERROR', error: error as Error });
      }
    }
  }, [text, startListening, dispatch, state.isSpeaking]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (!isUnmountedRef.current) {
      silenceDetector.stop();
      recordingManager.cleanup();
      speechManager.cancel();
      
      dispatch({ type: 'STOP_SPEAKING' });
      dispatch({ type: 'STOP_LISTENING' });
    }
  }, [dispatch]);

  // Handle initialization
  useEffect(() => {
    // Skip if already initialized or text hasn't changed
    if (hasInitialized.current && text === currentTextRef.current) {
      return;
    }

    // Update current text
    currentTextRef.current = text;

    if (autoStart) {
      hasInitialized.current = true;
      speak();
    }
  }, [text, autoStart, speak]);

  // Handle cleanup on unmount only
  useEffect(() => {
    isUnmountedRef.current = false;
    
    return () => {
      isUnmountedRef.current = true;
      cleanup();
    };
  }, []); // Empty dependency array means this only runs on mount/unmount

  return {
    ...state,
    speak,
    cleanup,
    startListening
  };
}
