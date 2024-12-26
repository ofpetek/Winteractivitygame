import { useState, useRef, useEffect, useCallback } from 'react';
import { Question } from '../../../presentations';
import Spotlight from 'react-spotlight';
import { useSpeechInteraction } from '../../hooks/useSpeechInteraction';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

interface PointOnImageProps {
  question: Question;
  imageUrl: string;
  onAnswer: (correct: boolean) => void;
  onSpeechStateChange: (speaking: boolean, listening: boolean) => void;
}

export function PointOnImage({ 
  question, 
  imageUrl, 
  onAnswer,
  onSpeechStateChange 
}: PointOnImageProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [spotlightConfig, setSpotlightConfig] = useState({
    x: 0,
    y: 0,
    radius: 100,
    show: false
  });

  const handleRecognizedSpeech = useCallback((text: string, audioBlob?: Blob) => {
    console.log('🎯 handleRecognizedSpeech called');
    console.log('📝 Recognized text:', text);
    
    if (audioBlob) {
      console.log('🎵 Received audio blob:', {
        size: audioBlob.size,
        type: audioBlob.type
      });
    } else {
      console.log('⚠️ No audio blob received');
    }
  }, []);

  // Speech interaction setup
  const { isSpeaking, isListening, speak, startListening, stopListening } = useSpeechInteraction({
    text: question.text,
    onRecognizedSpeech: handleRecognizedSpeech,
    expectedAnswer: question.answer,
    onEvaluated: (result) => {
      console.log('📊 Answer evaluation:', result);
      onAnswer(result.isCorrect);
      // You might want to show feedback to the user here
      // For example, using a toast notification
    },
    autoStart: false
  });

  // Update speech state
  useEffect(() => {
    onSpeechStateChange(isSpeaking, isListening);
  }, [isSpeaking, isListening, onSpeechStateChange]);

  const handleStart = useCallback(() => {
    setStarted(true);
    speak();
  }, [speak]);

  // Start listening when speech ends
  useEffect(() => {
    if (started && !isSpeaking) {
      console.log('🎤 Speech ended, starting to listen...');
      startListening();
    }
  }, [started, isSpeaking, startListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  const updateSpotlightPosition = useCallback(() => {
    if (!imageRef.current || !question.presentation.coordinates) return;

    const rect = imageRef.current.getBoundingClientRect();
    const coords = question.presentation.coordinates;
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    // Calculate center position in absolute page coordinates
    const centerX = rect.left + (coords.x + coords.width / 2) * rect.width + scrollX;
    const centerY = rect.top + (coords.y + coords.height / 2) * rect.height + scrollY;

    // Calculate radius based on the target area in pixels
    const targetWidth = coords.width * rect.width;
    const targetHeight = coords.height * rect.height;
    const radius = Math.max(targetWidth, targetHeight) * 2;

    setSpotlightConfig({
      x: centerX,
      y: centerY,
      radius,
      show: started // Only show spotlight after starting
    });
  }, [question.presentation.coordinates, started]);

  // Calculate spotlight position and size
  useEffect(() => {
    updateSpotlightPosition();
  }, [updateSpotlightPosition]);

  // Update spotlight on window resize and scroll
  useEffect(() => {
    window.addEventListener('resize', updateSpotlightPosition);
    window.addEventListener('scroll', updateSpotlightPosition);
    
    return () => {
      window.removeEventListener('resize', updateSpotlightPosition);
      window.removeEventListener('scroll', updateSpotlightPosition);
    };
  }, [updateSpotlightPosition]);

  return (
    <div className="relative w-full max-w-2xl mx-auto" ref={containerRef}>
      <div className="relative">
        <img
          ref={imageRef}
          src={imageUrl}
          alt={question.text}
          className="w-full h-auto"
          onLoad={updateSpotlightPosition}
        />
        {spotlightConfig.show && (
          <Spotlight
            x={spotlightConfig.x}
            y={spotlightConfig.y}
            radius={spotlightConfig.radius}
            color="rgba(0, 0, 0, 0.85)"
            borderColor="#fff"
            borderWidth={2}
            usePercentage={false}
            responsive={false}
            animSpeed={1000}
            outerStyles={{
              border: 'none'
            }}
            innerStyles={{
              filter: 'blur(30px)',
            }}
          >
            <div 
              style={{
                position: 'absolute',
                left: '50%',
                top: '-20px',
                transform: 'translate(-50%, -100%)',
                color: '#fff',
                textShadow: '0 0 4px rgba(0,0,0,0.5)',
                whiteSpace: 'nowrap',
                fontSize: '14px',
              }}
            >
              {isSpeaking ? 'Look here!' : 'What is this?'}
            </div>
          </Spotlight>
        )}
      </div>
      
      <div className="mt-4 text-lg text-center flex flex-col items-center gap-4">
        {!started ? (
          <Button 
            onClick={handleStart}
            size="lg"
            className="gap-2"
          >
            <Play className="w-4 h-4" />
            Start Practice
          </Button>
        ) : (
          <div className="text-muted-foreground">
            {isSpeaking ? 'Speaking...' : isListening ? 'Listening for your answer...' : 'Please say your answer'}
          </div>
        )}
      </div>
    </div>
  );
}
