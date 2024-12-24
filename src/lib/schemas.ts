import { z } from "zod";

// Base schemas
export const imageSchema = z.object({
  url: z.string(),
  alt: z.string().optional(),
  fileName: z.string(),
});

export const questionSchema = z.object({
  text: z.string(),
  coordinates: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }).optional(),
  correctAnswer: z.string(),
  type: z.enum(['color', 'object', 'action', 'custom']),
});

// Schema for creating/updating a practice
export const practiceCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  images: z.array(imageSchema).default([]),
  weekId: z.string(),
  questions: z.array(questionSchema).optional(),
  isActive: z.boolean().default(true),
});

// Full practice schema including server-generated fields
export const practiceSchema = practiceCreateSchema.extend({
  id: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Schema for creating/updating a week
export const weekCreateSchema = z.object({
  weekNumber: z.number().min(1),
  title: z.string().min(1),
  description: z.string(),
  isActive: z.boolean().default(false),
  practices: z.array(practiceCreateSchema).default([]),
});

// Full week schema including server-generated fields
export const weekSchema = weekCreateSchema.extend({
  id: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Types
export type Image = z.infer<typeof imageSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Practice = z.infer<typeof practiceSchema>;
export type PracticeCreate = z.infer<typeof practiceCreateSchema>;
export type Week = z.infer<typeof weekSchema>;
export type WeekCreate = z.infer<typeof weekCreateSchema>;
