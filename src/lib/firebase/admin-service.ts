import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore';
import { deleteObject, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebaseConfig';
import { COLLECTION_NAMES } from './collections';
import type { Week, Practice, Image } from '../schemas';

export const adminService = {
  // Weeks
  async createWeek(weekData: Omit<Week, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const weeksRef = collection(db, COLLECTION_NAMES.WEEKS);
      const docRef = await addDoc(weeksRef, {
        ...weekData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating week:', error);
      throw error;
    }
  },

  async getWeek(weekId: string) {
    const weeksRef = collection(db, COLLECTION_NAMES.WEEKS);
    const docRef = doc(weeksRef, weekId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Week;
    }
    return null;
  },

  async getAllWeeks() {
    const weeksRef = collection(db, COLLECTION_NAMES.WEEKS);
    const querySnapshot = await getDocs(weeksRef);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Week[];
  },

  async updateWeek(weekId: string, weekData: Partial<Week>) {
    const weeksRef = collection(db, COLLECTION_NAMES.WEEKS);
    const docRef = doc(weeksRef, weekId);
    await updateDoc(docRef, {
      ...weekData,
      updatedAt: serverTimestamp(),
    });
  },

  async deleteWeek(weekId: string) {
    // First delete all practices associated with this week
    const practices = await this.getPracticesByWeekId(weekId);
    for (const practice of practices) {
      await this.deletePractice(practice.id);
    }
    
    // Then delete the week
    const weeksRef = collection(db, COLLECTION_NAMES.WEEKS);
    await deleteDoc(doc(weeksRef, weekId));
  },

  // Practices
  async createPractice(weekId: string, practiceData: Omit<Practice, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      console.log('Creating practice with data:', { weekId, ...practiceData });
      
      // Create a new document reference in the practices collection
      const practicesRef = collection(db, COLLECTION_NAMES.PRACTICES);
      const docRef = await addDoc(practicesRef, {
        ...practiceData,
        weekId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // Get the created practice to verify
      const createdPractice = await getDoc(docRef);
      console.log('Created practice:', { id: docRef.id, ...createdPractice.data() });
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating practice:', error);
      throw error;
    }
  },

  async getPractice(practiceId: string) {
    const practicesRef = collection(db, COLLECTION_NAMES.PRACTICES);
    const docRef = doc(practicesRef, practiceId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Practice;
    }
    return null;
  },

  async getPracticesByWeekId(weekId: string) {
    console.log('Getting practices for weekId:', weekId);
    const practicesRef = collection(db, COLLECTION_NAMES.PRACTICES);
    const q = query(practicesRef, where('weekId', '==', weekId));
    const querySnapshot = await getDocs(q);
    const practices = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Practice[];
    console.log('Found practices:', practices);
    return practices;
  },

  async updatePractice(practiceId: string, data: Partial<Practice>) {
    try {
      const practicesRef = collection(db, COLLECTION_NAMES.PRACTICES);
      const practiceRef = doc(practicesRef, practiceId);
      const updateData = {
        ...data,
        updatedAt: serverTimestamp(),
      };
      
      await updateDoc(practiceRef, updateData);
      console.log('Practice updated successfully:', practiceId);
    } catch (error) {
      console.error('Error updating practice:', error);
      throw error;
    }
  },

  async deletePractice(practiceId: string) {
    const practicesRef = collection(db, COLLECTION_NAMES.PRACTICES);
    const practiceRef = doc(practicesRef, practiceId);
    const practice = await getDoc(practiceRef);
    
    if (practice.exists()) {
      try {
        // Delete practice document
        await deleteDoc(practiceRef);

        // Delete associated images
        const images = practice.data().images || [];
        for (const image of images) {
          await this.deleteImage(image.fileName);
        }
      } catch (error) {
        console.error('Error deleting practice:', error);
        throw error;
      }
    }
  },

  // Images
  async uploadImage(file: File, practiceId: string): Promise<Image> {
    try {
      const storageRef = ref(storage, `practices/${practiceId}/${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      return {
        url,
        alt: file.name,
        fileName: file.name
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  },

  async deleteImage(fileName: string) {
    try {
      const imageRef = ref(storage, fileName);
      await deleteObject(imageRef);
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  },
};
