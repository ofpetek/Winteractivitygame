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
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private isAnalyserReady = false;

  private async setupAudioContext(stream: MediaStream) {
    try {
      // If we have an existing context, suspend it first
      if (this.audioContext?.state === 'running') {
        await this.audioContext.suspend();
      }

      // Create new context only if we don't have one or if it's closed
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioContext();
      }

      // Resume the context if it's suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      console.log('🎵 AudioContext state:', this.audioContext.state);

      this.analyser = this.audioContext.createAnalyser();
      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);

      // Configure analyser
      this.analyser.fftSize = 2048;
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;
      this.analyser.smoothingTimeConstant = 0.85;

      console.log('🎛️ Audio context and analyser set up successfully');
      this.isAnalyserReady = true;
    } catch (error) {
      console.error('❌ Error setting up audio context:', error);
      this.isAnalyserReady = false;
      throw error;
    }
  }

  public async startRecording({
    deviceId,
    onDataAvailable,
    onStart,
    onError
  }: {
    deviceId: string;
    onDataAvailable: (blob: Blob) => void;
    onStart: () => void;
    onError: (error: Error) => void;
  }) {
    try {
      console.log('🎙️ Starting new recording session');
      
      await this.stopRecording();

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { 
          deviceId,
          sampleRate: { ideal: 44100 },
          channelCount: { ideal: 1 },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      console.log('📡 Media stream acquired');

      await this.setupAudioContext(this.stream);
      console.log('🎚️ Audio context setup complete');

      const supportedType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(supportedType)) {
        throw new Error('WebM with Opus codec not supported');
      }

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: supportedType,
        audioBitsPerSecond: 128000
      });

      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        console.log('⏹️ MediaRecorder stopped');
        if (this.audioChunks.length > 0) {
          try {
            const audioBlob = new Blob(this.audioChunks, { type: supportedType });
            console.log('📼 Recording completed, size:', audioBlob.size);
            onDataAvailable(audioBlob);
          } catch (error) {
            console.error('❌ Error creating audio blob:', error);
            onError(error instanceof Error ? error : new Error(String(error)));
          }
        } else {
          console.warn('⚠️ No audio data recorded');
        }
      };

      this.mediaRecorder.start(100);
      console.log('▶️ MediaRecorder started');
      onStart();

    } catch (error) {
      console.error('❌ Error in startRecording:', error);
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  public async stopRecording() {
    console.log('⏹️ Stopping recording...');
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop();
      console.log('⏹️ MediaRecorder stopped');
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        console.log('🎤 Audio track stopped');
      });
    }

    if (this.audioContext) {
      try {
        await this.audioContext.suspend();
        console.log('🎵 AudioContext suspended');
      } catch (error) {
        console.error('❌ Error suspending audio context:', error);
      }
    }
  }

  public getAnalyser(): AnalyserNode | null {
    return this.isAnalyserReady ? this.analyser : null;
  }

  public async dispose() {
    await this.stopRecording();
    if (this.audioContext) {
      try {
        await this.audioContext.close();
        console.log('🎵 AudioContext closed');
      } catch (error) {
        console.error('❌ Error closing audio context:', error);
      }
    }
    this.audioContext = null;
    this.analyser = null;
    this.isAnalyserReady = false;
  }
}
