export interface AudioRecordingOptions {
  deviceId?: string;
  onDataAvailable?: (blob: Blob) => void;
  onStart?: () => void;
  onStop?: () => void;
  onError?: (error: Error) => void;
}

export class AudioRecordingManager {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async startRecording(options: AudioRecordingOptions): Promise<void> {
    try {
      // Get media stream
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: options.deviceId }
      });

      // Create media recorder
      this.mediaRecorder = new MediaRecorder(this.stream);
      this.audioChunks = [];

      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
        options.onDataAvailable?.(event.data);
      };

      this.mediaRecorder.onstart = () => {
        options.onStart?.();
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        options.onStop?.();
        options.onDataAvailable?.(audioBlob);
        this.audioChunks = [];
      };

      // Start recording
      this.mediaRecorder.start();
    } catch (error) {
      options.onError?.(error as Error);
      throw error;
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    // Stop all tracks in the stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  cleanup(): void {
    this.stopRecording();
    this.audioChunks = [];
    this.mediaRecorder = null;
  }
}
