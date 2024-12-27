import { useEffect, useCallback, useRef } from 'react';
import { useVoiceSettings } from '../contexts/VoiceSettingsContext';
import { useVoiceLevel } from '../contexts/VoiceLevelContext';
import { AnswerEvaluationService } from '../services/AnswerEvaluationService';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { startRecording, stopRecording, setAudioBlob } from '../slices/audioSlice';
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

export function useSpeechInteraction({
  text,
  expectedAnswer,
  onEvaluated,
  autoStart = true
}: UseSpeechInteractionProps) {
  const dispatch = useDispatch();
  const isSpeaking = useSelector((state: RootState) => state.speech.isSpeaking);
  const isGivingFeedback = useSelector((state: RootState) => state.speech.isGivingFeedback);
  const feedback = useSelector((state: RootState) => state.speech.feedbackText);
  const isListening = useSelector((state: RootState) => state.audio.isRecording);
  const { settings } = useVoiceSettings();
  const { setAudioLevel } = useVoiceLevel();
  const hasSpoken = useRef(false);
  const hasAnswered = useRef(false);
  const audioRecordingManager = useRef(new AudioRecordingManager()).current;
  const speechManager = useRef(SpeechManager.getInstance()).current;

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
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
      if (expectedAnswer && onEvaluated) {
        const evaluationService = AnswerEvaluationService.getInstance();
        const result = await evaluationService.evaluateAnswer(audioBlob, text, expectedAnswer);

        // Stop listening before giving feedback
        stopListening();
        hasAnswered.current = true;

        // Speak feedback
        const feedbackText = result.feedback + (result.suggestion ? ` ${result.suggestion}` : '');
        dispatch(setFeedbackText(feedbackText));
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
      audioRecordingManager.stopRecording();
      dispatch(stopRecording());
      isListeningRef.current = false;
      console.log('✅ Recording stopped');
    } else {
      console.log('ℹ️ No active recording to stop');
    }
  }, [dispatch, stopRecording, audioRecordingManager]);

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
        audioRecordingManager.startRecording({
          deviceId: settings.devices[0],
          onDataAvailable: (blob: Blob) => {
            console.log('💾 Recording completed. Audio size:', blob.size, 'bytes');
            dispatch(setAudioBlob(blob));
            processAudio(blob);
          },
          onStart: () => {
            dispatch(startRecording());
            console.log('▶️ Recording started');
          },
          onError: (error: Error) => {
            console.error('❌ Error during recording:', error);
          }
        });

        // Set up audio context and analyser
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(await navigator.mediaDevices.getUserMedia({ audio: { deviceId: settings.devices[0] } }));
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

        dispatch(startRecording());
        isListeningRef.current = true;

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
  }, [isListening, settings.devices, detectSilence, dispatch, startRecording, audioRecordingManager, processAudio, setAudioBlob]);

  const speak = useCallback(() => {
    if (!isSpeaking && text) {
      speechManager.speak(text);
      dispatch(startSpeaking());
      hasSpoken.current = true;
    }
  }, [text, settings, isSpeaking, dispatch, startSpeaking, speechManager]);

  const speakFeedback = useCallback((feedbackText: string) => {
    if (!feedbackText) return;
    dispatch(startGivingFeedback());
    speechManager.speak(feedbackText);
    speechManager.onend = () => {
      dispatch(stopGivingFeedback());
    }
  }, [dispatch, startGivingFeedback, stopGivingFeedback, speechManager]);
  // Reset hasAnswered when text changes
  useEffect(() => {
    hasAnswered.current = false;
  }, [text]);

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