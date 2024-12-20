import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

// Initialize Gemini with API key from environment
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || '');

// Define input/output schemas using Zod
const InputSchema = z.object({
  spokenWord: z.string(),
  audioFile: z.object({
    mimeType: z.string(),
    data: z.string() // base64 encoded audio data
  }).optional()
});

const OutputSchema = z.object({
  passphrase: z.object({
    text: z.string(),
    confidence: z.number(),
    language: z.string(),
    isValid: z.boolean()
  }),
  message: z.string()
});

// Create the model with specific configuration
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
  generationConfig: {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
  }
});

export const validateSecretWordFlow = async (input: z.infer<typeof InputSchema>) => {
  try {
    const { spokenWord, audioFile } = InputSchema.parse(input);

    // Generate the content
    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [{
          text: `Analyze the following input and return a structured response about the passphrase.
                ${audioFile ? 'Audio input: [audio data provided]' : `Text input: "${spokenWord}"`}
                
                Compare if the input matches or is similar to the secret word "winterspiel".
                Provide confidence score, detected language, and validity.
                
                Return the response in the following JSON structure:
                {
                  "passphrase": {
                    "text": "transcribed or provided text",
                    "confidence": 0.0-1.0,
                    "language": "detected language code",
                    "isValid": true/false based on similarity to "winterspiel"
                  }
                }`
        }]
      }]
    });

    const response = await result.response;
    const parsedResponse = JSON.parse(response.text());
    
    return OutputSchema.parse({
      passphrase: parsedResponse.passphrase,
      message: parsedResponse.passphrase.isValid ? 
        'Correct secret word!' : 
        'Incorrect secret word. Please try again.'
    });
  } catch (error) {
    console.error('Error in validateSecretWord flow:', error);
    throw error;
  }
};
