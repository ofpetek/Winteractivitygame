import React from 'react';
import { Settings } from 'lucide-react';
import { Button } from './ui/button';
import { useVoiceSettings } from '../contexts/VoiceSettingsContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export function VoiceSettingsDialog() {
  const { settings, updateSettings, isDialogOpen, setIsDialogOpen } = useVoiceSettings();

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 right-4 p-0"
        onClick={() => setIsDialogOpen(true)}
      >
        <Settings className="h-5 w-5 text-white" />
      </Button>

      {isDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Voice Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Microphone</label>
                <Select
                  value={settings.selectedDeviceId}
                  onValueChange={(value) => updateSettings({ selectedDeviceId: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a microphone" />
                  </SelectTrigger>
                  <SelectContent>
                    {settings.devices.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${device.deviceId}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Silence Threshold</label>
                <input
                  type="range"
                  min="-10"
                  max="0"
                  step="1"
                  value={settings.silenceThreshold}
                  onChange={(e) => updateSettings({ silenceThreshold: Number(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-sm text-gray-500 text-center">
                  {settings.silenceThreshold}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
