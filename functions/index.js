const functions = require('firebase-functions');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Google Gemini with API key from environment
const genAI = new GoogleGenerativeAI(functions.config().gemini.key);

exports.validateSecretWord = functions.https.onCall(async (data, context) => {
    try {
        const { spokenWord } = data;
        
        // Input validation
        if (!spokenWord || typeof spokenWord !== 'string') {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'The function must be called with a "spokenWord" argument.'
            );
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        
        const prompt = `Compare if the spoken word "${spokenWord}" matches or is similar to the secret word "winterspiel". 
                      Return only "true" if it matches or is very similar, "false" otherwise.`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        return {
            isValid: text.toLowerCase().includes('true'),
            message: text.toLowerCase().includes('true') 
                ? 'Correct secret word!' 
                : 'Incorrect secret word. Please try again.'
        };
    } catch (error) {
        console.error('Error validating secret word:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Error validating secret word.',
            error
        );
    }
});
