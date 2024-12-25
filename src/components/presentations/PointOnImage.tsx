import { useState, useRef, useEffect } from 'react';
import { Question } from '../../../presentations';

interface PointOnImageProps {
  question: Question;
  imageUrl: string;
  onAnswer: (correct: boolean) => void;
}

export function PointOnImage({ question, imageUrl, onAnswer }: PointOnImageProps) {
  console.log(question, imageUrl);
  const [selectedPoint, setSelectedPoint] = useState<{ x: number; y: number } | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleImageClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    setSelectedPoint({ x, y });

    // Check if the click is within the correct area
    const coordinates = question.presentation.coordinates;
    if (!coordinates) return;

    const isCorrect = 
      x >= coordinates.x && 
      x <= coordinates.x + coordinates.width &&
      y >= coordinates.y && 
      y <= coordinates.y + coordinates.height;

    onAnswer(isCorrect);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div 
        className="relative cursor-pointer"
        onClick={handleImageClick}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt={question.text}
          className="w-full h-auto"
        />
        {selectedPoint && (
          <div
            className="absolute w-4 h-4 bg-red-500 rounded-full transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${selectedPoint.x * 100}%`,
              top: `${selectedPoint.y * 100}%`,
            }}
          />
        )}
        {/* Debug overlay for the correct area */}
        {question.presentation.coordinates && (
          <div
            className="absolute border-2 border-green-500 opacity-30"
            style={{
              left: `${question.presentation.coordinates.x * 100}%`,
              top: `${question.presentation.coordinates.y * 100}%`,
              width: `${question.presentation.coordinates.width * 100}%`,
              height: `${question.presentation.coordinates.height * 100}%`,
            }}
          />
        )}
      </div>
      <p className="mt-4 text-lg text-center">{question.text}</p>
    </div>
  );
}
