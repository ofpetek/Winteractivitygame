import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebaseConfig';

export class AudioTranscriptionService {
  private static instance: AudioTranscriptionService;
  private functions = getFunctions(app);
  private transcribeAudio = httpsCallable(this.functions, 'processAudio');

  private constructor() {}

  static getInstance(): AudioTranscriptionService {
    if (!this.instance) {
      this.instance = new AudioTranscriptionService();
    }
    return this.instance;
  }

  async transcribe(audioBlob: Blob): Promise<string> {
    try {
      // Convert blob to base64
      const base64Audio = await this.blobToBase64(audioBlob);
      
      // Call Firebase function
      const result = await this.transcribeAudio({
        mimeType: 'audio/wav',
        data: base64Audio
      });

      return result.data as string;
    } catch (error) {
      console.error('Transcription error:', error);
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
