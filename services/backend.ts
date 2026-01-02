import { User, WorkoutLog } from '../types';
import { auth, db, googleProvider } from './firebase';
import { 
  signInWithPopup, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc,
  runTransaction,
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';

// Collection References
const USERS_COL = 'users';
const LOGS_COL = 'workout_logs';

export const backend = {
  // --- AUTHENTICATION ---

  getCurrentUser: async (): Promise<User | null> => {
    // We wait for Firebase to initialize auth state
    return new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
        unsubscribe();
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, USERS_COL, firebaseUser.uid));
          if (userDoc.exists()) {
            return resolve(userDoc.data() as User);
          }
        }
        resolve(null);
      });
    });
  },

  signInWithGoogle: async (): Promise<User> => {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    const userRef = doc(db, USERS_COL, user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data() as User;
    } else {
      // Create new basic user doc
      const newUser: User = {
        id: user.uid,
        email: user.email || '',
        name: user.displayName || '',
        avatar: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
        goalDays: 0,
        pairingCode: '', // Set during profile creation
        wagerAmount: 0,
        partnerId: null
      };
      await setDoc(userRef, newUser);
      return newUser;
    }
  },

  signOut: async () => {
    await firebaseSignOut(auth);
  },

  // --- USER MANAGEMENT ---

  updateProfile: async (userId: string, data: Partial<User>): Promise<User> => {
    const userRef = doc(db, USERS_COL, userId);
    await updateDoc(userRef, data);
    const updated = await getDoc(userRef);
    return updated.data() as User;
  },

  getUserById: async (userId: string): Promise<User | null> => {
    const docRef = doc(db, USERS_COL, userId);
    const snap = await getDoc(docRef);
    return snap.exists() ? (snap.data() as User) : null;
  },

  // --- PARTNER SYNC ---

  findUserByCode: async (code: string): Promise<User | null> => {
    // Note: In production, store codes in uppercase to ensure case-insensitivity matches
    const q = query(collection(db, USERS_COL), where("pairingCode", "==", code.toUpperCase()));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    return querySnapshot.docs[0].data() as User;
  },

  linkPartners: async (initiatorId: string, partnerCode: string): Promise<{user: User, partner: User}> => {
    // Transactions ensure both users update, or neither does (preventing bad states)
    return await runTransaction(db, async (transaction) => {
      // 1. Get Initiator
      const initiatorRef = doc(db, USERS_COL, initiatorId);
      const initiatorSnap = await transaction.get(initiatorRef);
      if (!initiatorSnap.exists()) throw new Error("User does not exist!");
      
      // 2. Find Partner
      const q = query(collection(db, USERS_COL), where("pairingCode", "==", partnerCode.toUpperCase()));
      const partnerQuery = await getDocs(q);
      
      if (partnerQuery.empty) throw new Error("Invalid Partner Code");
      const partnerSnap = partnerQuery.docs[0];
      const partnerRef = partnerSnap.ref;

      const initiatorData = initiatorSnap.data() as User;
      const partnerData = partnerSnap.data() as User;

      // 3. Validations
      if (initiatorData.id === partnerData.id) throw new Error("You cannot link to yourself.");
      if (partnerData.partnerId) throw new Error("This user is already in a battle.");

      // 4. Perform Updates
      transaction.update(initiatorRef, { 
        partnerId: partnerData.id 
      });
      
      transaction.update(partnerRef, { 
        partnerId: initiatorData.id,
        wagerAmount: initiatorData.wagerAmount // Sync wager
      });

      return {
        user: { ...initiatorData, partnerId: partnerData.id },
        partner: { ...partnerData, partnerId: initiatorData.id, wagerAmount: initiatorData.wagerAmount }
      };
    });
  },

  unlinkPartner: async (userId: string) => {
    const userRef = doc(db, USERS_COL, userId);
    const userSnap = await getDoc(userRef);
    if(!userSnap.exists()) return;

    const userData = userSnap.data() as User;
    
    const batch = [];
    // Unlink self
    await updateDoc(userRef, { partnerId: null });

    // Unlink partner if exists
    if (userData.partnerId) {
      const partnerRef = doc(db, USERS_COL, userData.partnerId);
      await updateDoc(partnerRef, { partnerId: null });
    }
  },

  // --- LOGS (REAL TIME) ---

  // Add a new workout
  addLog: async (log: WorkoutLog) => {
    // We omit 'id' because Firestore generates it, or we use the passed ID as doc ID
    const { id, ...logData } = log;
    await setDoc(doc(db, LOGS_COL, id), logData);
  },

  // Subscribe to logs for both users (Real-time sync)
  subscribeToLogs: (userIds: string[], callback: (logs: WorkoutLog[]) => void) => {
    if (userIds.length === 0) return () => {};

    const q = query(
      collection(db, LOGS_COL),
      where("userId", "in", userIds),
      // Indexing might be required for complex queries in Firestore console
      // orderBy("date", "desc"), 
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const logs: WorkoutLog[] = [];
      querySnapshot.forEach((doc) => {
        logs.push({ id: doc.id, ...doc.data() } as WorkoutLog);
      });
      // Client-side sort if index not ready
      logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      callback(logs);
    });

    return unsubscribe;
  }
};
