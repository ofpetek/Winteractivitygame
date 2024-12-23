import {
  collection,
  CollectionReference,
  DocumentData,
  QueryDocumentSnapshot,
  SnapshotOptions,
  FirestoreDataConverter,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { 
  weekSchema, 
  weekCreateSchema,
  practiceSchema,
  practiceCreateSchema,
  type Week,
  type Practice 
} from '../schemas';

// Generic converter factory
function createConverter<T, U = T>(
  readSchema: any,
  writeSchema: any = readSchema
): FirestoreDataConverter<T> {
  return {
    toFirestore(data: Partial<T>): DocumentData {
      // Remove undefined fields
      const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);
      
      return writeSchema.parse(cleanData);
    },
    fromFirestore(
      snapshot: QueryDocumentSnapshot,
      options: SnapshotOptions
    ): T {
      const data = snapshot.data(options);
      
      // Convert Firestore Timestamps to Dates
      const convertedData = Object.entries(data).reduce((acc, [key, value]) => {
        if (value instanceof Timestamp) {
          acc[key] = value.toDate();
        } else if (value === null || value === undefined) {
          // Skip null or undefined values
          return acc;
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);

      // Add document ID to the data
      convertedData.id = snapshot.id;
      
      try {
        return readSchema.parse(convertedData);
      } catch (error) {
        console.error('Error parsing document:', snapshot.id, error);
        throw error;
      }
    },
  };
}

// Helper to create a typed collection reference
function createCollection<T, U = T>(
  collectionName: string, 
  readSchema: any,
  writeSchema?: any
) {
  return collection(db, collectionName)
    .withConverter(createConverter<T, U>(readSchema, writeSchema)) as CollectionReference<T>;
}

// Create typed collections
export const collections = {
  weeks: createCollection<Week>('weeks', weekSchema, weekCreateSchema),
  practices: createCollection<Practice>('practices', practiceSchema, practiceCreateSchema),
};

// Collection path constants
export const COLLECTION_NAMES = {
  WEEKS: 'weeks',
  PRACTICES: 'practices',
} as const;
