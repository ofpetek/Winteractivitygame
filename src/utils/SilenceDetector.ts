export interface SilenceDetectorOptions {
  threshold: number;
  silenceDuration: number;
  onSilenceStart?: () => void;
  onSilenceEnd?: () => void;
  onSilenceThresholdReached?: () => void;
}

export class SilenceDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private silenceTimeout: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private options: SilenceDetectorOptions;

  constructor(options: SilenceDetectorOptions) {
    this.options = options;
  }

  async start(stream: MediaStream): Promise<void> {
    this.cleanup();

    // Create audio context and analyser
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    
    // Configure analyser
    this.analyser.fftSize = 2048;
    this.analyser.minDecibels = -90;
    this.analyser.maxDecibels = -10;
    this.analyser.smoothingTimeConstant = 0.85;

    // Connect stream to analyser
    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.analyser);

    // Start detection loop
    this.isRunning = true;
    this.detectSilence();
  }

  private detectSilence = () => {
    if (!this.analyser || !this.isRunning) return;

    const bufferLength = this.analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteTimeDomainData(dataArray);

    // Calculate RMS value
    let sumSquares = 0;
    for (let i = 0; i < bufferLength; i++) {
      const value = dataArray[i] - 128;
      sumSquares += value * value;
    }
    const rms = Math.sqrt(sumSquares / bufferLength);

    if (rms < this.options.threshold) {
      if (!this.silenceTimeout) {
        this.options.onSilenceStart?.();
        this.silenceTimeout = setTimeout(() => {
          this.options.onSilenceThresholdReached?.();
        }, this.options.silenceDuration);
      }
    } else {
      if (this.silenceTimeout) {
        clearTimeout(this.silenceTimeout);
        this.silenceTimeout = null;
        this.options.onSilenceEnd?.();
      }
    }

    // Continue detection loop
    if (this.isRunning) {
      requestAnimationFrame(this.detectSilence);
    }
  };

  stop(): void {
    this.isRunning = false;
    this.cleanup();
  }

  private cleanup(): void {
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
  }
}
