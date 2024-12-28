import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AudioData {
  data: string;  // base64 encoded audio
  mimeType: string;
}

interface AudioState {
  isRecording: boolean;
  audioData: AudioData | null;
  audioLevel: number;
}

const initialState: AudioState = {
  isRecording: false,
  audioData: null,
  audioLevel: 0,
};

const audioSlice = createSlice({
  name: 'audio',
  initialState,
  reducers: {
    startRecording: (state) => {
      state.isRecording = true;
      state.audioData = null;
    },
    stopRecording: (state) => {
      state.isRecording = false;
    },
    setAudioData: (state, action: PayloadAction<AudioData>) => {
      state.audioData = action.payload;
    },
    clearAudio: (state) => {
      state.audioData = null;
    },
    setAudioLevel: (state, action: PayloadAction<number>) => {
      state.audioLevel = action.payload;
    },
  },
});

export const { startRecording, stopRecording, setAudioData, clearAudio, setAudioLevel } = audioSlice.actions;

export default audioSlice.reducer;