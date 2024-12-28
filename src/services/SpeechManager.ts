export class SpeechManager {
  private static instance: SpeechManager;
  private readonly synth: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private isInitialized = false;
  private speakQueue: string[] = [];
  private isSpeaking = false;
  private onStateChange?: (isSpeaking: boolean) => void;

  private constructor() {
    this.synth = window.speechSynthesis;
    this.initializeVoices();
  }

  private async initializeVoices(): Promise<void> {
    // Try to load voices immediately
    this.voices = this.synth.getVoices();
    
    // If no voices are available, wait for them to load
    if (this.voices.length === 0) {
      await new Promise<void>((resolve) => {
        const onVoicesChanged = () => {
          this.voices = this.synth.getVoices();
          this.synth.removeEventListener('voiceschanged', onVoicesChanged);
          resolve();
        };
        this.synth.addEventListener('voiceschanged', onVoicesChanged);
      });
    }

    this.isInitialized = true;
    console.log('[SpeechManager] Initialized with voices:', 
      this.voices.map(v => ({ name: v.name, lang: v.lang }))
    );
  }

  private getGermanVoice(): SpeechSynthesisVoice | null {
    // First try to find a German voice
    const germanVoices = this.voices.filter(voice => 
      voice.lang.startsWith('de') || voice.lang.startsWith('de-DE')
    );

    // Prefer non-local voices
    const nonLocalGermanVoice = germanVoices.find(voice => !voice.localService);
    if (nonLocalGermanVoice) {
      return nonLocalGermanVoice;
    }

    // Fall back to any German voice
    if (germanVoices.length > 0) {
      return germanVoices[0];
    }

    // Last resort: use any available voice
    return this.voices[0] || null;
  }

  public static getInstance(): SpeechManager {
    if (!SpeechManager.instance) {
      SpeechManager.instance = new SpeechManager();
    }
    return SpeechManager.instance;
  }

  public setOnStateChange(callback: (isSpeaking: boolean) => void) {
    this.onStateChange = callback;
  }

  private setSpeaking(value: boolean) {
    this.isSpeaking = value;
    this.onStateChange?.(value);
  }

  private createUtterance(text: string): SpeechSynthesisUtterance {
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = this.getGermanVoice();
    
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = 'de-DE';
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    return utterance;
  }

  private async processQueue(): Promise<void> {
    if (this.isSpeaking || this.speakQueue.length === 0) {
      return;
    }

    this.setSpeaking(true);
    const text = this.speakQueue.shift()!;

    try {
      await new Promise<void>((resolve, reject) => {
        const utterance = this.createUtterance(text);

        utterance.onend = () =>
        {
          console.log('[SpeechManager] Speech ended');
          this.setSpeaking(false);
          resolve();
          // Process next item in queue
          this.processQueue();
        };

        utterance.onerror = (event) => {
          this.setSpeaking(false);
          reject(event);
          // Process next item in queue even if there's an error
          this.processQueue();
        };

        // Make sure synthesis is in a clean state
        this.synth.cancel();
        this.synth.resume();
        this.synth.speak(utterance);
      });
    } catch (error) {
      console.error('[SpeechManager] Error speaking:', error);
      this.setSpeaking(false);
    }
  }

  public async speak(text: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeVoices();
    }

    // Add to queue
    this.speakQueue.push(text);
    
    // Start processing if not already speaking
    return this.processQueue();
  }

  public cancel(): void {
    this.speakQueue = [];
    this.isSpeaking = false;
    this.synth.cancel();
  }

  public isCurrentlySpeaking(): boolean {
    return this.isSpeaking || this.synth.speaking;
  }
}
