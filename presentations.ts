import { z } from 'zod';
import { SchemaType } from "@google/generative-ai";
// Define presentation types
export const PointOnImage = z.object({
  type: z.literal('point_on_image'),
  coordinates: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
});

export const SpeakWord = z.object({
  type: z.literal('speak_word'),
  expectedPronunciation: z.string().optional(),
  phonetics: z.string().optional(),
});

export const ChooseFromOptions = z.object({
  type: z.literal('choose_from_options'),
  options: z.array(z.string()),
});

export const MakeSound = z.object({
  type: z.literal('make_sound'),
  soundType: z.enum(['animal', 'object', 'nature']),
  example: z.string().optional(),
});

export const ActOut = z.object({
  type: z.literal('act_out'),
  action: z.string(),
  duration: z.number().optional(),
});

export const CountObjects = z.object({
  type: z.literal('count_objects'),
  locations: z.array(
    z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    })
  ),
});

export const Presentation = z.union([
  PointOnImage,
  SpeakWord,
  ChooseFromOptions,
  MakeSound,
  ActOut,
  CountObjects,
]);

export const Question = z.object({
  text: z.string(),
  answer: z.string(),
  presentation: Presentation,
});

// Now export inferred types from zod
export type Presentation = z.infer<typeof Presentation>;
export type Question = z.infer<typeof Question>;
export type PointOnImage = z.infer<typeof PointOnImage>;
export type SpeakWord = z.infer<typeof SpeakWord>;
export type ChooseFromOptions = z.infer<typeof ChooseFromOptions>;
export type MakeSound = z.infer<typeof MakeSound>;
export type ActOut = z.infer<typeof ActOut>;
export type CountObjects = z.infer<typeof CountObjects>;

// Utility function to convert Zod schema to GoogleGenerativeAI schema
export function zodToGenerativeSchema(schema: z.ZodType): any {
  if (schema instanceof z.ZodString) {
    return { type: SchemaType.STRING };
  }
  
  if (schema instanceof z.ZodNumber) {
    return { type: SchemaType.NUMBER };
  }
  
  if (schema instanceof z.ZodBoolean) {
    return { type: SchemaType.BOOLEAN };
  }
  
  if (schema instanceof z.ZodArray) {
    return {
      type: SchemaType.ARRAY,
      items: zodToGenerativeSchema(schema.element),
    };
  }
  
  if (schema instanceof z.ZodObject) {
    const shape = schema._def.shape();
    const properties: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToGenerativeSchema(value);
    }
    
    return {
      type: SchemaType.OBJECT,
      properties,
    };
  }
  
  if (schema instanceof z.ZodEnum) {
    return {
      type: SchemaType.STRING,
      enum: schema._def.values,
    };
  }
  
  if (schema instanceof z.ZodUnion) {
    // For union types, we'll create an enum from literal types if possible
    const options = schema._def.options;
    const literals = options
      .filter((opt: any) => opt instanceof z.ZodLiteral)
      .map((opt: any) => opt._def.value);
      
    if (literals.length === options.length) {
      return {
        type: SchemaType.STRING,
        enum: literals,
      };
    }
    
    // If not all union members are literals, handle the first type
    return zodToGenerativeSchema(options[0]);
  }
  
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    const innerSchema = zodToGenerativeSchema(schema.unwrap());
    return {
      ...innerSchema,
      nullable: true,
    };
  }
  
  if (schema instanceof z.ZodLiteral) {
    const literalValue = schema._def.value;
    const literalType = typeof literalValue;
    
    return {
      type: literalType === 'string' ? SchemaType.STRING :
            literalType === 'number' ? SchemaType.NUMBER :
            literalType === 'boolean' ? SchemaType.BOOLEAN :
            SchemaType.STRING,
      enum: [literalValue],
    };
  }
  
  // Default fallback
  return { type: SchemaType.STRING };
}

// Example usage:
export const questionResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    questions: {
      type: SchemaType.ARRAY,
      items: zodToGenerativeSchema(Question)
    }
  }
};

export const presentationResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    presentation: zodToGenerativeSchema(Presentation)
  }
};