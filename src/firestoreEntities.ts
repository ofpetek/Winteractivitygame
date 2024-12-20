import { db } from './firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';

// Define the Activities entity
export const addActivity = async (activity: { name: string; description: string }) => {
    try {
        const docRef = await addDoc(collection(db, 'activities'), activity);
        console.log("Activity added with ID: ", docRef.id);
    } catch (e) {
        console.error("Error adding activity: ", e);
    }
};

// Define the Users entity
export const addUser = async (user: { name: string; email: string }) => {
    try {
        const docRef = await addDoc(collection(db, 'users'), user);
        console.log("User added with ID: ", docRef.id);
    } catch (e) {
        console.error("Error adding user: ", e);
    }
};

// Define the Feedback entity
export const addFeedback = async (feedback: { userId: string; activityId: string; comment: string }) => {
    try {
        const docRef = await addDoc(collection(db, 'feedback'), feedback);
        console.log("Feedback added with ID: ", docRef.id);
    } catch (e) {
        console.error("Error adding feedback: ", e);
    }
};
