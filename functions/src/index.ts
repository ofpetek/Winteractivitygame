import {
  GoogleGenerativeAI,
  SchemaType,
} from "@google/generative-ai";

import * as functions from 'firebase-functions';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { presentationResponseSchema, Question } from '../../presentations';
// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || '');

async function generateQuestionsFromImage(imageData: { data: string, mimeType: string }, description: string): Promise<Question[]> {
  const prompt = `
    Analyze this image and create interactive questions for children based on the following description:
    "${description}"
    
    Generate questions that are engaging and educational.
    
    Make sure to:
    1. Create age-appropriate and engaging questions
    2. Focus on elements clearly visible in the image
    3. Vary the types of interactions to keep children engaged
    4. Use appropriate presentation types for each question
  `;

  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
      responseSchema: presentationResponseSchema
    },
    systemInstruction: prompt
  });

  try {
    console.log('imageData', imageData.data.slice(0, 500));
    console.log('imageMymeType', imageData.mimeType);
    
    const result = await model.generateContent([
      { 
        inlineData: { 
          mimeType: imageData.mimeType, 
          data: imageData.data 
        } 
      },
      { text: 'generate questions for this image' }, 
      ],);
    
    const response = await result.response;
    const text = response.text();
    
    // Parse the JSON response
    console.log('Generated questions:', text);
    const data = JSON.parse(text);
    console.log('Parsed questions:', data);
    return data;
  } catch (error) {
    console.error('Error generating questions:', error);
    throw error;
  }
}

export const onPracticeCreated = onDocumentCreated('practices/{practiceId}', async (event) => {
  const practice = event.data?.data();
  
  if (!practice || !practice.images || practice.images.length === 0) {
    console.log('No practice data or images found');
    return;
  }

  try {
    // Generate questions for each image
    const imageResponse = await fetch(practice.images[0].url);
    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    const imageData = { data: base64Image, mimeType: 'image/png' };

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const { questions } = await generateQuestionsFromImage(
      imageData,
      practice.description
    );

    // Update the practice document with the generated questions
    await event.data?.ref.update({
      questions,
      updatedAt: new Date(),
    });

    console.log('Successfully generated questions for practice:', event.params.practiceId);
  } catch (error) {
    console.error('Error in onPracticeCreated:', error);
    throw error;
  }
});

export const onPracticeUpdated = onDocumentUpdated('practices/{practiceId}', async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();
  
  // Only regenerate questions if the image or description has changed
  if (!afterData || 
      !afterData.images || 
      afterData.images.length === 0 ||
      (beforeData?.images[0]?.url === afterData.images[0]?.url && 
       beforeData?.description === afterData.description)) {
    return;
  }

  try {
    // Generate new questions
    const imageResponse = await fetch(afterData.images[0].url);
    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    const imageData = { data: base64Image, mimeType: 'image/png' };

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-expect-error
    const { questions } = await generateQuestionsFromImage(
      imageData,
      afterData.description
    );

    // Update the practice document with the new questions
    await event.data?.after.ref.update({
      questions,
      updatedAt: new Date(),
    });

    console.log('Successfully updated questions for practice:', event.params.practiceId);
  } catch (error) {
    console.error('Error in onPracticeUpdated:', error);
    throw error;
  }
});

export const processAudio = functions.https.onRequest(async (req, res) => {
  try {
       // Handle OPTIONS request
     if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Origin', '*'); // Allow requests from any origin
        res.set('Access-Control-Allow-Methods', 'POST, OPTIONS'); // Allow POST and OPTIONS methods
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Allow Content-Type and Authorization headers
        res.end(); // Send a response to the preflight request
        return;
      }
      
      // Ensure this is a POST request
      if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
      }
      // Allow cors
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Allow Content-Type and Authorization headers
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS'); // Allow POST and OPTIONS methods
    
    // Validate request body
    const { data } = req.body;
    if (!data || !data.data || !data.mimeType) {
      res.status(400).send('Missing required fields: data.data or data.mimeType');
      return;
    }
    if (process.env.GOOGLE_GENAI_API_KEY === undefined) {
      res.status(500).send('Missing required environment variable: GOOGLE_GENAI_API_KEY');
      return;
    }
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY);
    if (!genAI) {
      res.status(500).send('Failed to initialize Generative AI');
      return;
    }


    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      systemInstruction: "You are an agent responsible for understanding one pass phrase said in german.",
      generationConfig: {
        temperature: 1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            passphrase: {
              type: SchemaType.STRING,
            }
          }
        },
      },
    });

    // Generate content using the audio data directly
    const result = await model.generateContent([
      {
        inlineData: {
          data: data.data,
          mimeType: data.mimeType,
        }
      },
      {
        text: "What is the spoken word in German?",
      }
    ]);

    // Get the response
    const response = result.response;
    console.log('response', JSON.stringify(response));
    
    const text = response.text();

    /*
      {
    "result": "{\n\"passphrase\":\"Fünf Äpfel\"\n}",
    "candidates": [
        {
            "content": {
                "parts": [
                    {
                        "text": "{\n\"passphrase\":\"Fünf Äpfel\"\n}"
                    }
                ],
                "role": "model"
            },
            "finishReason": "STOP",
            "safetyRatings": [
                {
                    "category": "HARM_CATEGORY_HATE_SPEECH",
                    "probability": "NEGLIGIBLE"
                },
                {
                    "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                    "probability": "NEGLIGIBLE"
                },
                {
                    "category": "HARM_CATEGORY_HARASSMENT",
                    "probability": "NEGLIGIBLE"
                },
                {
                    "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    "probability": "NEGLIGIBLE"
                }
            ],
            "avgLogprobs": -0.3907984495162964
        }
    ]
}
    */

    const { passphrase } = JSON.parse(text); // Parse the JSON text
    // Send the response back
    res.json({ result: passphrase.toLowerCase().replace(/ä/g, 'a').replace(/ü/g, 'u').replace(/\s/g, '') });

  } catch (error) {
    console.error('Error processing audio:', error);
    res.status(500).json({ 
      error: 'Failed to process audio',
    });
  }
});

export const evaluateAnswer = functions.https.onRequest(async (req, res) => {
  try {
    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.end();
      return;
    }

    // Ensure this is a POST request
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    // Allow cors
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');

    // Validate request body
    const { audioData, question, expectedAnswer } = req.body.data;
    if (!audioData || !audioData.data || !audioData.mimeType || !question || !expectedAnswer) {
      res.status(400).send('Missing required fields: audioData, question, or expectedAnswer');
      return;
    }

    if (process.env.GOOGLE_GENAI_API_KEY === undefined) {
      res.status(500).send('Missing required environment variable: GOOGLE_GENAI_API_KEY');
      return;
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY);
    if (!genAI) {
      res.status(500).send('Failed to initialize Generative AI');
      return;
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      systemInstruction: `You are an educational assistant evaluating a child's verbal response to a language learning question.
      Your role is to:
      1. Listen carefully to the audio response
      2. If you cannot hear any clear speech or the audio is silent, respond with:
         {
           "isCorrect": false,
           "score": 0,
           "feedback": "I couldn't hear your answer clearly. Could you please speak a bit louder?"
         }
      3. If you can hear the response:
         - Compare it to the expected answer
         - Evaluate if it's correct, partially correct, or incorrect
         - Provide encouraging feedback appropriate for a child
         - If partially correct or incorrect, explain why in a child-friendly way
         - Give a suggestion for improvement if needed,
         - IMPORTANT! if pronounciation is off, give feedback about that
      4. IMPORTANT! NEVER mark a silent or unclear response as correct`,
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            isCorrect: { type: SchemaType.BOOLEAN },
            score: { type: SchemaType.NUMBER },
            feedback: { type: SchemaType.STRING },
            suggestion: { type: SchemaType.STRING, nullable: true },
            unclear: { type: SchemaType.BOOLEAN, nullable: true },
          },
          required: ["isCorrect", "feedback"],
        },
      },
    });

    // Generate content using the audio data
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: audioData.mimeType,
          data: audioData.data
        }
      },
      {
        text: `Question: "${question}"
        Expected Answer: "${expectedAnswer}"
        Please evaluate the audio response. If the audio is silent or unclear, respond with: unclear
        IMPORTANT! NEVER mark a silent or unclear response as correct`
      }
    ]);

    const response = await result.response;
    const evaluation = JSON.parse(response.text());

    res.status(200).json(evaluation);
  } catch (error) {
    console.error('Error in evaluateAnswer:', error);
    res.status(500).send('Internal Server Error');
  }
});