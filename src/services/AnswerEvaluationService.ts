import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebaseConfig';

interface EvaluationResult {
  isCorrect: boolean;
  score: number;
  feedback: string;
  suggestion?: string;
}

export class AnswerEvaluationService {
  private static instance: AnswerEvaluationService;
  private functions = getFunctions(app);
  private evaluateAnswerCall = httpsCallable(this.functions, 'evaluateAnswer');

  private constructor() {}

  static getInstance(): AnswerEvaluationService {
    if (!this.instance) {
      this.instance = new AnswerEvaluationService();
    }
    return this.instance;
  }

  public async evaluateAnswer(audioBlob: Blob, question: string, expectedAnswer: string): Promise<EvaluationResult> {
    try {
      // Convert blob to base64
      const base64Audio = await this.blobToBase64(audioBlob);
      
      // Call Firebase function with data property
      const result = await this.evaluateAnswerCall({
          audioData: {
            mimeType: 'audio/wav',
            data: base64Audio
          },
          question,
          expectedAnswer
      });

      return result.data as EvaluationResult;
    } catch (error) {
      console.error('Evaluation error:', error);
      throw error;
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Audio = (reader.result as string).split(',')[1];
        resolve(base64Audio);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
