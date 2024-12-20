scienceBeta: Firebase Genkit is in Beta, which means that it is not subject to any SLA or deprecation pol
could change in backwards-incompatible ways. Throughout the Beta period, Firebase Genkit and its
documentation will be updated and improved.
Get started
This guide shows you how to get started with Genkit in a Node.js app.
Prerequisites
This guide assumes that you're familiar with building applications with Node.js.
To complete this quickstart, make sure that your development environment meets the following
requirements:
Node.js v20+
npm
Install Genkit dependencies
Install the following Genkit dependencies to use Genkit in your project:
genkit provides Genkit core capabilities.
@genkit-ai/googleai provides access to the Google AI Gemini models.
Configure your model API k
For this guide, we’ll show you how to use the Gemini API which provides a generous free tier and
does not require a credit card to get started. To use the Gemini API, you'll need an API key. If you
don't already have one, create a key in Google AI Studio.
$ npm install genkit @genkit-ai/googleai
Get an API key from Google AI Studio (https://makersuite.google.com/app/apikey?authuser=0)
After you’ve created an API key, set the GOOGLE_GENAI_API_KEY environment variable to your key
with the following command:
Note: While this tutorial uses the Gemini API from AI Studio, Genkit supports a wide variety of model providers