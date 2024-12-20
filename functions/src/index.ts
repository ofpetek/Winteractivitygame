/* eslint-disable @typescript-eslint/ban-ts-comment */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import * as functions from 'firebase-functions';
import { z } from 'zod';

// Initialize Gemini with API key from environment
const genAI = new GoogleGenerativeAI(functions.config().gemini.key);
const fileManager = new GoogleAIFileManager(functions.config().gemini.key);

// Define input/output schemas using Zod
export const InputSchema = z.object({
  audioFile: z.object({
    mimeType: z.string(),
    data: z.string() // base64 encoded audio data
  })
});

export const OutputSchema = z.object({
  passphrase: z.string()
});

// Create the model with specific configuration
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
  systemInstruction: "You are an agent responsible for understanding one pass phrase said in german."
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 50,
  responseMimeType: "application/json",
  responseSchema: {
    type: "object",
    properties: {
      passphrase: {
        type: "string"
      }
    }
  }
};

/**
 * Uploads the audio data to Gemini.
 */
async function uploadAudioToGemini(audioData: string, mimeType: string) {
  const buffer = Buffer.from(audioData, 'base64');
  const uploadResult = await fileManager.uploadFile(buffer, {
    mimeType,
    displayName: `audio_${Date.now()}`
  });
  return uploadResult.file;
}

// Export the Cloud Function
export const validateSecretWord = functions.https.onCall(
  /** @type { { audioFile: { mimeType: string, data: string }} } */
  async (data) => {
    try {
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Must provide an object with audioFile'
        );
      }

      // @ts-ignore
      const { audioFile } = data;
      
      // Input validation
      if (!audioFile) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Must provide audioFile'
        );
      }

      // Upload audio file to Gemini
      const file = await uploadAudioToGemini(audioFile.data, audioFile.mimeType);
      console.log(`Uploaded file as: ${file.name}`);

      // Start chat session with the uploaded file
      const chatSession = model.startChat({
        generationConfig,
        history: [
          {
            role: "user",
            parts: [
              {
                fileData: {
                  mimeType: file.mimeType,
                  fileUri: file.uri,
                },
              },
            ],
          },
        ],
      });

      // Get response from the model
      const result = await chatSession.sendMessage("What was the passphrase spoken in the audio?");
      const response = result.response.text();
      
      // Parse the JSON response
      // The response will be in the format: ```json\n{"passphrase": "spoken word"}\n```
      const jsonStr = response.replace(/```json\n|\n```/g, '');
      const parsedResponse = JSON.parse(jsonStr);
      
      return {
        passphrase: parsedResponse.passphrase
      };
    } catch (error) {
      console.error('Error in validateSecretWord function:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Error processing request',
        error
      );
    }
  }
);
