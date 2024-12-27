import { configureStore } from '@reduxjs/toolkit';
import audioReducer from './slices/audioSlice';
import speechReducer from './slices/speechSlice';

export const store = configureStore({
  reducer: {
    audio: audioReducer,
    speech: speechReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;