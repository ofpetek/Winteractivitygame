import { useState, useEffect, useCallback } from 'react';
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

  // Initialize speech synthesis
  const speak = useCallback(() => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      startListening();
    };
    window.speechSynthesis.speak(utterance);
  }, [text]);

  // Initialize speech recognition
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onRecognizedSpeech(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [onRecognizedSpeech]);

  // Start the interaction when component mounts
  useEffect(() => {
    if (autoStart) {
      speak();
    }
  }, [autoStart, speak]);

  return {
    isSpeaking,
    isListening,
    speak,
    startListening
  };
}
