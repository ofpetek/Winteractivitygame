import { 
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebaseConfig';
import { collections, COLLECTION_NAMES } from './collections';
import type { Week, Practice, Image } from '../schemas';

export const adminService = {
  // Weeks
  async createWeek(weekData: Omit<Week, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const docRef = await addDoc(collections.weeks, {
        ...weekData,
        practices: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating week:', error);
      throw error;
    }
  },

  async updateWeek(weekId: string, weekData: Partial<Week>) {
    const weekRef = doc(collections.weeks, weekId);
    await updateDoc(weekRef, {
      ...weekData,
      updatedAt: serverTimestamp(),
    });
  },

  async deleteWeek(weekId: string) {
    await deleteDoc(doc(collections.weeks, weekId));
  },

  async getAllWeeks() {
    const q = query(collections.weeks, orderBy('weekNumber'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getWeek(weekId: string) {
    const weekRef = doc(collections.weeks, weekId);
    const weekDoc = await getDoc(weekRef);
    if (weekDoc.exists()) {
      return { id: weekDoc.id, ...weekDoc.data() };
    }
    return null;
  },

  // Practices
  async createPractice(weekId: string, practiceData: Omit<Practice, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collections.practices, {
      ...practiceData,
      weekId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Update week's practices array
    const weekRef = doc(collections.weeks, weekId);
    const week = await getDoc(weekRef);
    if (week.exists()) {
      const practices = week.data().practices || [];
      await updateDoc(weekRef, {
        practices: [...practices, { id: docRef.id, ...practiceData }],
      });
    }

    return docRef.id;
  },

  async updatePractice(practiceId: string, practiceData: Partial<Practice>) {
    const practiceRef = doc(collections.practices, practiceId);
    await updateDoc(practiceRef, {
      ...practiceData,
      updatedAt: serverTimestamp(),
    });

    // Update practice in week's practices array
    const practice = await getDoc(practiceRef);
    if (practice.exists()) {
      const weekId = practice.data().weekId;
      const weekRef = doc(collections.weeks, weekId);
      const week = await getDoc(weekRef);
      if (week.exists()) {
        const practices = week.data().practices || [];
        const updatedPractices = practices.map((p: Practice) =>
          p.id === practiceId ? { ...p, ...practiceData } : p
        );
        await updateDoc(weekRef, { practices: updatedPractices });
      }
    }
  },

  async deletePractice(practiceId: string) {
    const practiceRef = doc(collections.practices, practiceId);
    const practice = await getDoc(practiceRef);
    
    if (practice.exists()) {
      const weekId = practice.data().weekId;
      
      // Delete practice document
      await deleteDoc(practiceRef);

      // Remove practice from week's practices array
      const weekRef = doc(collections.weeks, weekId);
      const week = await getDoc(weekRef);
      if (week.exists()) {
        const practices = week.data().practices || [];
        const updatedPractices = practices.filter((p: Practice) => p.id !== practiceId);
        await updateDoc(weekRef, { practices: updatedPractices });
      }

      // Delete associated images
      const images = practice.data().images || [];
      for (const image of images) {
        await this.deleteImage(image.fileName);
      }
    }
  },

  // Images
  async uploadImage(file: File, weekId: string, practiceId: string): Promise<Image> {
    const fileName = `${weekId}/${practiceId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, fileName);
    
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    return {
      url,
      fileName,
      uploadedAt: new Date(),
    };
  },

  async deleteImage(fileName: string) {
    const storageRef = ref(storage, fileName);
    await deleteObject(storageRef);
  },
};
