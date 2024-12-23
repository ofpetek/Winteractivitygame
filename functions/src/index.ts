/* eslint-disable @typescript-eslint/ban-ts-comment */
import {
  GoogleGenerativeAI,
  SchemaType,
} from "@google/generative-ai";

import * as functions from 'firebase-functions';

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