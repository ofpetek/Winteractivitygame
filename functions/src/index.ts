import {
  GoogleGenerativeAI,
  SchemaType,
} from "@google/generative-ai";

import * as functions from 'firebase-functions';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { Presentation } from '../../presentations.ts';
// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY || '');

async function generateQuestionsFromImage(imageUrl: string, description: string): Promise<Question[]> {
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 8192,
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          questions: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                text: { type: SchemaType.STRING },
                answer: { type: SchemaType.STRING },
                presentation: {
                  type: SchemaType.OBJECT,
                  properties: {
                    type: {
                      type: SchemaType.STRING,
                      enum: [
                        'point_on_image',
                        'speak_word',
                        'choose_from_options',
                        'make_sound',
                        'act_out',
                        'count_objects'
                      ]
                    },
                    // For point_on_image and count_objects
                    coordinates: {
                      type: SchemaType.OBJECT,
                      nullable: true,
                      properties: {
                        x: { type: SchemaType.NUMBER },
                        y: { type: SchemaType.NUMBER },
                        width: { type: SchemaType.NUMBER },
                        height: { type: SchemaType.NUMBER }
                      }
                    },
                    // For count_objects
                    locations: {
                      type: SchemaType.ARRAY,
                      nullable: true,
                      items: {
                        type: SchemaType.OBJECT,
                        properties: {
                          x: { type: SchemaType.NUMBER },
                          y: { type: SchemaType.NUMBER },
                          width: { type: SchemaType.NUMBER },
                          height: { type: SchemaType.NUMBER }
                        }
                      }
                    },
                    // For choose_from_options
                    options: {
                      type: SchemaType.ARRAY,
                      nullable: true,
                      items: { type: SchemaType.STRING }
                    },
                    // For speak_word
                    expectedPronunciation: {
                      type: SchemaType.STRING,
                      nullable: true,
                    },
                    phonetics: {
                      type: SchemaType.STRING,
                      nullable: true,
                    },
                    // For make_sound
                    soundType: {
                      type: SchemaType.STRING,
                      nullable: true,
                      enum: ['animal', 'object', 'nature']
                    },
                    example: {
                      type: SchemaType.STRING,
                      nullable: true,
                    },
                    // For act_out
                    action: {
                      type: SchemaType.STRING,
                      nullable: true,
                    },
                    duration: {
                      type: SchemaType.NUMBER,
                      nullable: true,
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  const prompt = `
    Analyze this image and create interactive questions for children based on the following description:
    "${description}"
    
    Generate questions that are engaging and educational. Each question should have a specific presentation type.
    Return the response in JSON format following this schema:
    
    Make sure to:
    1. Use presentation types appropriately for the content
    2. Include all required fields for each presentation type
    3. Make questions age-appropriate and engaging
    4. Focus on elements clearly visible in the image
    5. Vary the types of interactions to keep children engaged
  `;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: imageUrl } }]}],
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 8192,
      },
    });
    
    const response = await result.response;
    const text = response.text();
    
    // Parse the JSON response
    const data = JSON.parse(text);
    return data.questions;
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
    const questions = await generateQuestionsFromImage(
      practice.images[0].url,
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
    const questions = await generateQuestionsFromImage(
      afterData.images[0].url,
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

exports.processAudio = functions.https.onRequest(async (req, res) => {
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