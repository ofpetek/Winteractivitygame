import { createContext, useContext, useState, ReactNode } from 'react';

interface VoiceLevelContextType {
  audioLevel: number;
  setAudioLevel: (level: number) => void;
  isSpeaking: boolean;
  setIsSpeaking: (speaking: boolean) => void;
}

const VoiceLevelContext = createContext<VoiceLevelContextType | undefined>(undefined);

export function VoiceLevelProvider({ children }: { children: ReactNode }) {
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  return (
    <VoiceLevelContext.Provider 
      value={{ 
        audioLevel, 
        setAudioLevel, 
        isSpeaking, 
        setIsSpeaking 
      }}
    >
      {children}
    </VoiceLevelContext.Provider>
  );
}

export function useVoiceLevel() {
  const context = useContext(VoiceLevelContext);
  if (context === undefined) {
    throw new Error('useVoiceLevel must be used within a VoiceLevelProvider');
  }
  return context;
}
