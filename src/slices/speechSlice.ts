import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SpeechState {
  isSpeaking: boolean;
  isGivingFeedback: boolean;
  feedbackText: string;
}

const initialState: SpeechState = {
  isSpeaking: false,
  isGivingFeedback: false,
  feedbackText: '',
};

export const speechSlice = createSlice({
  name: 'speech',
  initialState,
  reducers: {
    startSpeaking: (state) => {
      state.isSpeaking = true;
    },
    stopSpeaking: (state) => {
      state.isSpeaking = false;
    },
    startGivingFeedback: (state) => {
      state.isGivingFeedback = true;
    },
    stopGivingFeedback: (state) => {
      state.isGivingFeedback = false;
    },
    setFeedbackText: (state, action: PayloadAction<string>) => {
      state.feedbackText = action.payload;
    },
  },
});

export const { startSpeaking, stopSpeaking, setFeedbackText, startGivingFeedback, stopGivingFeedback } = speechSlice.actions;

export default speechSlice.reducer;