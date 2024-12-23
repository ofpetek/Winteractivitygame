import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { COLLECTION_NAMES } from './collections';
import type { Week, Practice } from '../schemas';

export const gameService = {
  async getActiveWeek() {
    const weeksRef = collection(db, COLLECTION_NAMES.WEEKS);
    const q = query(weeksRef, where('isActive', '==', true));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    // Get the first active week
    const weekDoc = querySnapshot.docs[0];
    return { id: weekDoc.id, ...weekDoc.data() } as Week;
  },

  async getPracticesByWeekId(weekId: string) {
    const practicesRef = collection(db, COLLECTION_NAMES.PRACTICES);
    const q = query(
      practicesRef,
      where('weekId', '==', weekId),
      orderBy('createdAt', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Practice[];
  },

  async getPractice(practiceId: string) {
    const practiceRef = doc(collection(db, COLLECTION_NAMES.PRACTICES), practiceId);
    const practiceDoc = await getDoc(practiceRef);
    
    if (!practiceDoc.exists()) {
      return null;
    }
    
    return { id: practiceDoc.id, ...practiceDoc.data() } as Practice;
  },
};
