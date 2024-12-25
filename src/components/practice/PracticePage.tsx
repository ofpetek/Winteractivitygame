import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { PresentationWrapper } from '../presentations/PresentationWrapper';
import { Question } from '../../../presentations';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { SiriWaveWrapper } from '../common/SiriWaveWrapper';

export function PracticePage() {
  const { practiceId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [practice, setPractice] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    const fetchPractice = async () => {
      if (!practiceId) return;

      try {
        const practiceDoc = await getDoc(doc(db, 'practices', practiceId));
        if (!practiceDoc.exists()) {
          setError('Practice not found');
          return;
        }

        const practiceData = practiceDoc.data();
        setPractice(practiceData);
        setImageUrl(practiceData.images[0].url);
        
        // Fetch questions if they exist
        if (practiceData.questions) {
          setQuestions(practiceData.questions);
        }

        setLoading(false);
      } catch (err) {
        setError('Error loading practice');
        setLoading(false);
      }
    };

    fetchPractice();
  }, [practiceId]);

  const handleAnswer = (correct: boolean) => {
    setIsCorrect(correct);
    setShowFeedback(true);

    if (correct) {
      // Wait for feedback animation
      setTimeout(() => {
        setShowFeedback(false);
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
        } else {
          // Practice completed
          // You might want to navigate to a success page or show a completion modal
          alert('Practice completed!');
          navigate('/'); // Or wherever you want to go after completion
        }
      }, 1500);
    } else {
      // Show incorrect feedback briefly
      setTimeout(() => {
        setShowFeedback(false);
      }, 1500);
    }
  };

  const handleSpeechStateChange = (speaking: boolean, listening: boolean) => {
    setIsSpeaking(speaking);
    setIsListening(listening);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading practice...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-lg text-red-500">{error}</p>
        <Button onClick={() => navigate('/')}>Go Back</Button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">{practice?.title || 'Practice'}</h1>
        <div className="text-sm text-gray-500">
          Question {currentQuestionIndex + 1} of {questions.length}
        </div>
      </div>

      {currentQuestion && (
        <div className="relative">
          <PresentationWrapper
            question={currentQuestion}
            imageUrl={imageUrl}
            onAnswer={handleAnswer}
            onSpeechStateChange={handleSpeechStateChange}
          />
          
          {showFeedback && (
            <div className={`fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50`}>
              <div className={`text-4xl font-bold ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                {isCorrect ? 'Correct!' : 'Try Again!'}
              </div>
            </div>
          )}
        </div>
      )}

      <SiriWaveWrapper speaking={isSpeaking || isListening} />
    </div>
  );
}
