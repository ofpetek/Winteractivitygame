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

  public async evaluateAnswer(base64Audio: string, question: string, expectedAnswer: string): Promise<EvaluationResult> {
    try {
      
      
      // Call Firebase function with data property
      const result = await this.evaluateAnswerCall({
          audioData: {
            mimeType: 'audio/wav',
            data: base64Audio
          },
          question,
          expectedAnswer,
      });

      return result.data as EvaluationResult;
    } catch (error) {
      console.error('Evaluation error:', error);
      throw error;
    }
  }
}
