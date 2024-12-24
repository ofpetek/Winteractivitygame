/* eslint-disable @typescript-eslint/ban-ts-comment */
import { z } from 'zod';
import { zodToJsonSchema } from "zod-to-json-schema";
import { ResponseSchema } from "@google/generative-ai";

// Define presentation types
const Coordinates = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
}).describe('Coordinates for pointing or marking areas in image');

// Combined presentation schema that works with Gemini
const Presentation = z.object({
  type: z.enum(['point_on_image', 'speak_word', 'choose_from_options', 'make_sound', 'act_out', 'count_objects']),
  // Point on image fields
  coordinates: Coordinates.optional(),
  // Speak word fields
  expectedPronunciation: z.string().optional(),
  phonetics: z.string().optional(),
  // Choose from options fields
  options: z.array(z.string()).optional(),
  // Make sound fields
  soundType: z.enum(['animal', 'object', 'nature']).optional(),
  example: z.string().optional(),
  // Act out fields
  action: z.string().optional(),
  duration: z.number().optional(),
  // Count objects fields
  locations: z.array(Coordinates).optional(),
}).describe('Presentation configuration');

const Question = z.object({
  text: z.string(),
  answer: z.string(),
  presentation: Presentation,
}).describe('Question with presentation');

export const questionResponseSchema = z.object({
  questions: z.array(Question)
}).describe('Question response schema');


// Now export inferred types from zod
export type Presentation = z.infer<typeof Presentation>;
export type Question = z.infer<typeof Question>;

// @ts-ignore
function deepRemoveKeys(obj, exclude) {
  if (obj instanceof Array) {
    // @ts-ignore
    return obj.map((i) => deepRemoveKeys(i, exclude));
  }
  if (typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(
          ([k, v]) => !(k in exclude && (exclude[k] === undefined || exclude[k] === v))
      )
        // @ts-ignore
        .map(([k, v]) => [k, deepRemoveKeys(v, exclude)])
    );
  }
  return obj;
}

// @ts-ignore
function deepRenameKeys(obj, rename) {
  if (obj instanceof Array) {
    // @ts-ignore
    return obj.map((i) => deepRenameKeys(i, rename));
  }
  if (typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj)
        // @ts-ignore
        .map(([k, v]) => [rename[k] || k, deepRenameKeys(v, rename)])
    );
  }
  return obj;
}

export const presentationResponseSchema = deepRemoveKeys(zodToJsonSchema(questionResponseSchema, {
  name: 'questionResponseSchema',
  $refStrategy: 'none',
  strictUnions: true
}), { additionalProperties: false }).definitions?.questionResponseSchema as ResponseSchema;
