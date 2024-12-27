
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AudioState {
  isRecording: boolean;
  audioBlob: Blob | null;
  audioLevel: number;
}

const initialState: AudioState = {
  isRecording: false,
  audioBlob: null,
  audioLevel: 0,
};

export const audioSlice = createSlice({
  name: 'audio',
  initialState,
  reducers: {
    startRecording: (state) => {
      state.isRecording = true;
      state.audioBlob = null;
    },
    stopRecording: (state) => {
      state.isRecording = false;
    },
    setAudioBlob: (state, action: PayloadAction<Blob>) => {
      state.audioBlob = action.payload;
    },
    setAudioLevel: (state, action: PayloadAction<number>) => {
      state.audioLevel = action.payload;
    }
  },
});

export const { startRecording, stopRecording, setAudioBlob, setAudioLevel } = audioSlice.actions;

export default audioSlice.reducer;