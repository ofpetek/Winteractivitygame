import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useVoiceSettings } from '../contexts/VoiceSettingsContext';
import { useVoiceLevel } from '../contexts/VoiceLevelContext';
import { AnswerEvaluationService } from '../services/AnswerEvaluationService';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { startRecording, stopRecording, setAudioData } from '../slices/audioSlice';
import { startSpeaking, setFeedbackText, startGivingFeedback, stopGivingFeedback } from '../slices/speechSlice';
import { AudioRecordingManager } from '../services/AudioRecordingManager';
import { SpeechManager } from '../services/SpeechManager';

interface UseSpeechInteractionProps {
  text: string;
  onRecognizedSpeech?: (text: string) => void;
  expectedAnswer?: string;
  onEvaluated?: (result: { isCorrect: boolean; score: number; feedback: string; suggestion?: string }) => void;
  autoStart?: boolean;
}

export const useSpeechInteraction = ({
  text,
  expectedAnswer,
  onEvaluated,
  autoStart = true
}: UseSpeechInteractionProps) => {
  const dispatch = useDispatch();
  const { settings } = useVoiceSettings();
  const { setAudioLevel } = useVoiceLevel();
  const isListening = useSelector((state: RootState) => state.audio.isRecording);
  const isSpeaking = useSelector((state: RootState) => state.speech.isSpeaking);
  const feedback = useSelector((state: RootState) => state.speech.feedbackText);
  const isGivingFeedback = useSelector((state: RootState) => state.speech.isGivingFeedback);
  
  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isListeningRef = useRef(false);
  const silenceDetectionStartTime = useRef(0);
  const audioRecordingManager = useMemo(() => new AudioRecordingManager(), []);
  const speechManager = useMemo(() => SpeechManager.getInstance(), []);
  const isStartingRef = useRef(false);
  const hasSpoken = useRef(false);
  const hasAnswered = useRef(false);
  const lastSpeechStateChange = useRef(Date.now());
  const stateChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (stateChangeTimeoutRef.current) {
        clearTimeout(stateChangeTimeoutRef.current);
      }
      audioRecordingManager.dispose();
    };
  }, [audioRecordingManager]);

  const stopListening = useCallback(async () => {
    // Prevent rapid start/stop cycles
    const now = Date.now();
    if (now - lastSpeechStateChange.current < 500) {
      console.log('⏱️ Ignoring stop request - too soon after state change');
      return;
    }

    console.log('🛑 stopListening called, current state:', {
      isListening,
      isListeningRef: isListeningRef.current,
      hasTimeout: !!silenceTimeoutRef.current,
      isStarting: isStartingRef.current,
      timeSinceLastStateChange: now - lastSpeechStateChange.current
    });
    
    // Clear any pending timeouts
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (stateChangeTimeoutRef.current) {
      clearTimeout(stateChangeTimeoutRef.current);
      stateChangeTimeoutRef.current = null;
    }
    
    isListeningRef.current = false;
    isStartingRef.current = false;
    dispatch(stopRecording());
    await audioRecordingManager.stopRecording();
  }, [dispatch, isListening, audioRecordingManager]);

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          // Remove the data URL prefix (e.g., "data:audio/wav;base64,")
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert blob to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const processAudio = useCallback(async (audioBlob: Blob) => {
    if (audioBlob.size === 0) {
      console.warn('⚠️ Empty audio blob received, skipping processing');
      return;
    }

    try {
      // Skip if already answered
      if (hasAnswered.current) {
        console.log('Already answered, skipping audio processing');
        return;
      }

      console.log('Processing audio...', { type: audioBlob.type, size: audioBlob.size });

      // Convert blob to base64
      const base64Data = await blobToBase64(audioBlob);
      
      // Store in Redux
      dispatch(setAudioData({
        data: base64Data,
        mimeType: audioBlob.type
      }));

      // Your existing evaluation logic
      const evaluationService = AnswerEvaluationService.getInstance();
      const result = await evaluationService.evaluateAnswer(base64Data, text, expectedAnswer,
      );

      if (result.success) {
        hasAnswered.current = true;
        onEvaluated?.(result);
      }
    } catch (error) {
      console.error('Error processing audio:', error);
    }
  }, [dispatch, expectedAnswer, onEvaluated, text]);

  const detectSilence = useCallback((analyser: AnalyserNode) => {
    const bufferLength = analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);
    analyser.getFloatTimeDomainData(dataArray);

    let sumSquares = 0;
    for (const value of dataArray) {
      sumSquares += value * value;
    }
    const rms = Math.sqrt(sumSquares / bufferLength);

    // Update global audio level (normalized between 0 and 1)
    const baseLevel = rms / 128;
    const normalizedLevel = 0.1 + (Math.pow(baseLevel, 0.3) * 3);
    const finalLevel = Math.min(normalizedLevel, 0.9);
    setAudioLevel(finalLevel);

    // Always log the first few samples, then every 500ms
    const now = Date.now();
    if (silenceDetectionStartTime.current === 0) {
      silenceDetectionStartTime.current = now;
    }
    
    const threshold = Math.abs(settings.silenceThreshold);
    const isSilent = finalLevel < threshold;
    
    if (now - silenceDetectionStartTime.current < 1000 || now % 500 < 50) {
      console.log('🎤 Audio Levels:', {
        rms: rms.toFixed(4),
        baseLevel: baseLevel.toFixed(4),
        normalized: normalizedLevel.toFixed(4),
        final: finalLevel.toFixed(4),
        threshold: threshold.toFixed(4),
        isSilent
      });
    }

    // Check for silence
    if (isSilent) {
      console.log('📊 Silence check:', { 
        finalLevel: finalLevel.toFixed(4), 
        threshold: threshold.toFixed(4),
        hasTimeout: !!silenceTimeoutRef.current,
        isListening: isListeningRef.current
      });
      
      if (!silenceTimeoutRef.current && isListeningRef.current) {
        console.log('🤫 Silence detected, starting timeout...');
        silenceTimeoutRef.current = setTimeout(() => {
          console.log('⏰ Timeout callback triggered');
          if (isListeningRef.current) {
            console.log('🔇 Silence timeout reached, stopping recording...');
            stopListening();
          } else {
            console.log('⚠️ Not stopping - already stopped');
          }
        }, 1500);
      }
    } else {
      if (silenceTimeoutRef.current) {
        console.log('🗣️ Audio detected, clearing silence timeout');
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    }
  }, [settings.silenceThreshold, stopListening]);

  const startListening = useCallback(async () => {
    // Prevent rapid start/stop cycles
    const now = Date.now();
    if (now - lastSpeechStateChange.current < 500) {
      console.log('⏱️ Ignoring start request - too soon after state change');
      return;
    }

    if (isStartingRef.current) {
      console.log('⏳ Already starting recording, ignoring request');
      return;
    }

    if (!isListening && !isListeningRef.current) {
      try {
        isStartingRef.current = true;
        lastSpeechStateChange.current = now;
        
        console.log('🎯 Starting audio recording...', {
          timeSinceLastStateChange: now - lastSpeechStateChange.current,
          isListening,
          isListeningRef: isListeningRef.current
        });
        
        console.log('🎤 Requesting microphone access...');
        
        await audioRecordingManager.startRecording({
          deviceId: settings.devices[0],
          onDataAvailable: (blob: Blob) => {
            if (blob.size > 0) {
              console.log('💾 Recording completed. Audio size:', blob.size, 'bytes');
              processAudio(blob);
            } else {
              console.warn('⚠️ Empty recording received');
            }
          },
          onStart: () => {
            dispatch(startRecording());
            isListeningRef.current = true;
            isStartingRef.current = false;
            console.log('▶️ Recording started');

            // Start silence detection after a short delay to ensure analyzer is ready
            if (stateChangeTimeoutRef.current) {
              clearTimeout(stateChangeTimeoutRef.current);
            }
            
            stateChangeTimeoutRef.current = setTimeout(() => {
              if (!isListeningRef.current) {
                console.log('⚠️ Recording stopped before silence detection could start');
                return;
              }

              const analyser = audioRecordingManager.getAnalyser();
              if (analyser) {
                console.log('🎧 Starting silence detection loop');
                silenceDetectionStartTime.current = 0;
                const checkSilence = () => {
                  if (isListeningRef.current) {
                    detectSilence(analyser);
                    requestAnimationFrame(checkSilence);
                  } else {
                    console.log('🛑 Silence detection loop stopped');
                  }
                };
                checkSilence();
              } else {
                console.warn('⚠️ No analyser available for silence detection');
              }
            }, 1000); // Increased delay to ensure analyzer is ready
          },
          onError: (error: Error) => {
            console.error('❌ Error during recording:', error);
            isListeningRef.current = false;
            isStartingRef.current = false;
            dispatch(stopRecording());
          }
        });

      } catch (error) {
        console.error('❌ Error starting recording:', error);
        isListeningRef.current = false;
        isStartingRef.current = false;
        dispatch(stopRecording());
      }
    } else {
      console.log('⚠️ Already listening or starting, ignoring start request', {
        isListening,
        isListeningRef: isListeningRef.current,
        isStarting: isStartingRef.current,
        timeSinceLastStateChange: now - lastSpeechStateChange.current
      });
    }
  }, [isListening, settings.devices, detectSilence, dispatch, audioRecordingManager, processAudio]);

  // Set up speech state change handler
  useEffect(() => {
    const handleSpeechStateChange = async (isSpeaking: boolean) => {
      const now = Date.now();
      console.log('[useSpeechInteraction] Speech state changed:', isSpeaking, {
        timeSinceLastChange: now - lastSpeechStateChange.current
      });
      
      if (!isSpeaking) {
        // Wait a bit before starting to listen to avoid race conditions
        if (stateChangeTimeoutRef.current) {
          clearTimeout(stateChangeTimeoutRef.current);
        }
        
        stateChangeTimeoutRef.current = setTimeout(() => {
          if (!isListeningRef.current && !isStartingRef.current) {
            startListening();
          }
        }, 500);
      }
      
      lastSpeechStateChange.current = now;
    };

    speechManager.setOnStateChange(handleSpeechStateChange);
  }, [startListening, speechManager]);

  const speak = useCallback(() => {
    if (!isSpeaking && text) {
      dispatch({ type: 'speech/startSpeaking' });
      speechManager.speak(text);
      hasSpoken.current = true;
    }
  }, [text, isSpeaking, dispatch, speechManager]);

  const speakFeedback = useCallback((feedbackText: string) => {
    if (!feedbackText) return;
    dispatch(startGivingFeedback());
    speechManager.speak(feedbackText);
    speechManager.onend = () => {
      dispatch(stopGivingFeedback());
    }
  }, [dispatch, startGivingFeedback, stopGivingFeedback, speechManager]);

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
};
