import { useState, useRef, useEffect } from 'react';
import { Question } from '../../../presentations';
import Spotlight from 'react-spotlight';
import { useSpeechInteraction } from '../../hooks/useSpeechInteraction';

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
  const [spotlightConfig, setSpotlightConfig] = useState({
    x: 0,
    y: 0,
    radius: 100,
    show: false
  });

  // Speech interaction setup
  const { isSpeaking, isListening } = useSpeechInteraction({
    text: question.text,
    onRecognizedSpeech: (text) => {
      if (text.toLowerCase().includes(question.answer.toLowerCase())) {
        onAnswer(true);
      } else {
        onAnswer(false);
      }
    },
    autoStart: true
  });

  // Update speech state
  useEffect(() => {
    onSpeechStateChange(isSpeaking, isListening);
  }, [isSpeaking, isListening, onSpeechStateChange]);

  // Calculate spotlight position and size
  useEffect(() =>
  {
    if (imageRef.current && question.presentation.coordinates) {
      const rect = imageRef.current.getBoundingClientRect();
      const coords = question.presentation.coordinates;
      
      // Calculate center position in percentage
      const x = (coords.x + coords.width / 2) * 100;
      const y = (coords.y + coords.height / 2) * 100;
      
      // Calculate radius based on the target area
      const targetWidth = coords.width * rect.width;
      const targetHeight = coords.height * rect.height;
      const radius = Math.max(targetWidth, targetHeight) * 0.6; // Adjust this multiplier as needed

      setSpotlightConfig({
        x,
        y,
        radius,
        show: true
      });
    }
  }, [question.presentation.coordinates, imageUrl]);

  // Update spotlight on window resize
  useEffect(() => {
    const handleResize = () => {
      if (imageRef.current && question.presentation.coordinates) {
        const rect = imageRef.current.getBoundingClientRect();
        const coords = question.presentation.coordinates;
        
        const x = (coords.x + coords.width / 2) * 100;
        const y = (coords.y + coords.height / 2) * 100;
        
        const targetWidth = coords.width * rect.width;
        const targetHeight = coords.height * rect.height;
        const radius = Math.max(targetWidth, targetHeight) * 0.6;
        
        setSpotlightConfig(prev => ({
          ...prev,
          x,
          y,
          radius
        }));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [question.presentation.coordinates]);

  return (
    <div className="relative w-full max-w-2xl mx-auto" ref={containerRef}>
      <div className="relative">
        <img
          ref={imageRef}
          src={imageUrl}
          alt={question.text}
          className="w-full h-auto"
        />
      </div>
      
      <div className="mt-4 text-lg text-center flex flex-col items-center gap-2">
        <p>{question.text}</p>
        <div className="text-sm text-gray-500">
          {isSpeaking ? 'Speaking...' : isListening ? 'Listening for your answer...' : 'Please say your answer'}
        </div>
      </div>
      
      {spotlightConfig.show && (
        <Spotlight
          x={spotlightConfig.x}
          y={spotlightConfig.y}
          radius={spotlightConfig.radius}
          color="rgba(0, 0, 0, 0.85)"
          borderColor="#fff"
          borderWidth={2}
          usePercentage
          responsive
          animSpeed={1000}
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
              fontSize: '14px'
            }}
          >
            {isSpeaking ? 'Look here!' : 'What is this?'}
          </div>
        </Spotlight>
      )}
    </div>
  );
}
