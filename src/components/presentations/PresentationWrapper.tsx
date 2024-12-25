import { Question } from '../../../presentations';
import { PointOnImage } from './PointOnImage';

interface PresentationWrapperProps {
  question: Question;
  imageUrl: string;
  onAnswer: (correct: boolean) => void;
}

export function PresentationWrapper({ question, imageUrl, onAnswer }: PresentationWrapperProps) {
  switch (question.presentation.type) {
    case 'point_on_image':
      return (
        <PointOnImage
          question={question}
          imageUrl={imageUrl}
          onAnswer={onAnswer}
        />
      );
    // Add other presentation types here as they are implemented
    default:
      return (
        <div className="text-red-500">
          Unsupported presentation type: {question.presentation.type}
        </div>
      );
  }
}
