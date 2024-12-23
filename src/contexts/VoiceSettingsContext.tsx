import React, { createContext, useContext, useState, useEffect } from 'react';

interface VoiceSettings {
  selectedDeviceId: string;
  silenceThreshold: number;
  devices: MediaDeviceInfo[];
}

interface VoiceSettingsContextType {
  settings: VoiceSettings;
  updateSettings: (settings: Partial<VoiceSettings>) => void;
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
}

const VoiceSettingsContext = createContext<VoiceSettingsContextType | undefined>(undefined);

export function VoiceSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<VoiceSettings>({
    selectedDeviceId: '',
    silenceThreshold: -2,
    devices: [],
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    // Get audio input devices
    navigator.mediaDevices.enumerateDevices().then((deviceInfos) => {
      const audioDevices = deviceInfos.filter(device => device.kind === 'audioinput');
      setSettings(prev => ({
        ...prev,
        devices: audioDevices,
        selectedDeviceId: audioDevices[0]?.deviceId || '',
      }));
    });
  }, []);

  const updateSettings = (newSettings: Partial<VoiceSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <VoiceSettingsContext.Provider value={{ settings, updateSettings, isDialogOpen, setIsDialogOpen }}>
      {children}
    </VoiceSettingsContext.Provider>
  );
}

export function useVoiceSettings() {
  const context = useContext(VoiceSettingsContext);
  if (context === undefined) {
    throw new Error('useVoiceSettings must be used within a VoiceSettingsProvider');
  }
  return context;
}
