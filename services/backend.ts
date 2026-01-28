import { User, WorkoutLog, WeeklySummary } from '../types';
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
  deleteDoc,
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
const SUMMARIES_COL = 'weekly_summaries';

const generatePairingCode = (name: string) => {
  const cleanName = (name || 'USR').replace(/[^a-zA-Z]/g, '').toUpperCase();
  const prefix = (cleanName.length >= 3 ? cleanName.substring(0, 3) : (cleanName + 'XXX').substring(0, 3));
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${num}`;
};

export const backend = {
  // --- AUTHENTICATION ---

  getCurrentUser: async (): Promise<User | null> => {
    return new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
        unsubscribe();
        if (firebaseUser) {
          try {
            const userDoc = await getDoc(doc(db, USERS_COL, firebaseUser.uid));
            if (userDoc.exists()) {
              return resolve(userDoc.data() as User);
            }
          } catch (error) {
            console.error("Error fetching user profile:", error);
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
      const existingUser = userSnap.data() as User;
      if (!existingUser.pairingCode) {
        const newCode = generatePairingCode(existingUser.name);
        await updateDoc(userRef, { pairingCode: newCode });
        existingUser.pairingCode = newCode;
      }
      return existingUser;
    } else {
      const newCode = generatePairingCode(user.displayName || '');
      const newUser: User = {
        id: user.uid,
        email: user.email || '',
        name: user.displayName || '',
        avatar: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
        goalDays: 0,
        pairingCode: newCode, 
        wagerAmount: 0,
        partnerId: null,
        lastResetDate: new Date().toISOString()
      };
      await setDoc(userRef, newUser, { merge: true });
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

  updateSharedGoals: async (userId: string, partnerId: string | null, newGoal: number, newWager: number) => {
    return await runTransaction(db, async (transaction) => {
      const userRef = doc(db, USERS_COL, userId);
      transaction.update(userRef, { goalDays: newGoal, wagerAmount: newWager });

      if (partnerId) {
        const partnerRef = doc(db, USERS_COL, partnerId);
        transaction.update(partnerRef, { goalDays: newGoal, wagerAmount: newWager });
      }
    });
  },

  getUserById: async (userId: string): Promise<User | null> => {
    const docRef = doc(db, USERS_COL, userId);
    const snap = await getDoc(docRef);
    return snap.exists() ? (snap.data() as User) : null;
  },

  // --- SUMMARIES & RESET ---

  saveWeeklySummary: async (summary: WeeklySummary) => {
    const docRef = doc(db, SUMMARIES_COL, summary.id);
    await setDoc(docRef, summary);
  },

  getWeeklyHistory: async (userId: string): Promise<WeeklySummary[]> => {
    const q = query(
      collection(db, SUMMARIES_COL), 
      where("participantIds", "array-contains", userId),
      orderBy("weekStarting", "desc"),
      limit(20)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as WeeklySummary);
  },

  updateLastResetDate: async (userId: string, date: string) => {
    const userRef = doc(db, USERS_COL, userId);
    await updateDoc(userRef, { lastResetDate: date });
  },

  // --- PARTNER SYNC ---

  findUserByCode: async (code: string): Promise<User | null> => {
    if (!code) return null;
    const q = query(collection(db, USERS_COL), where("pairingCode", "==", code.toUpperCase()));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    return querySnapshot.docs[0].data() as User;
  },

  linkPartners: async (initiatorId: string, partnerCode: string): Promise<{user: User, partner: User}> => {
    return await runTransaction(db, async (transaction) => {
      const initiatorRef = doc(db, USERS_COL, initiatorId);
      const initiatorSnap = await transaction.get(initiatorRef);
      if (!initiatorSnap.exists()) throw new Error("User does not exist!");
      
      const q = query(collection(db, USERS_COL), where("pairingCode", "==", partnerCode.toUpperCase()));
      const partnerQuery = await getDocs(q);
      
      if (partnerQuery.empty) throw new Error("Invalid Partner Code");
      const partnerSnap = partnerQuery.docs[0];
      const partnerRef = partnerSnap.ref;

      const initiatorData = initiatorSnap.data() as User;
      const partnerData = partnerSnap.data() as User;

      if (initiatorData.id === partnerData.id) throw new Error("You cannot link to yourself.");
      if (partnerData.partnerId) throw new Error("This user is already in a battle.");

      transaction.update(initiatorRef, { 
        partnerId: partnerData.id 
      });
      
      transaction.update(partnerRef, { 
        partnerId: initiatorData.id,
        wagerAmount: initiatorData.wagerAmount
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
    await updateDoc(userRef, { partnerId: null });
    if (userData.partnerId) {
      const partnerRef = doc(db, USERS_COL, userData.partnerId);
      await updateDoc(partnerRef, { partnerId: null });
    }
  },

  // --- LOGS (REAL TIME) ---

  addLog: async (log: WorkoutLog) => {
    const { id, ...logData } = log;
    await setDoc(doc(db, LOGS_COL, id), logData);
  },

  updateLog: async (logId: string, data: Partial<WorkoutLog>) => {
    await updateDoc(doc(db, LOGS_COL, logId), data);
  },

  deleteLog: async (logId: string) => {
    await deleteDoc(doc(db, LOGS_COL, logId));
  },

  subscribeToLogs: (userIds: string[], callback: (logs: WorkoutLog[]) => void) => {
    if (userIds.length === 0) return () => {};
    const q = query(
      collection(db, LOGS_COL),
      where("userId", "in", userIds),
      limit(200)
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const logs: WorkoutLog[] = [];
      querySnapshot.forEach((doc) => {
        logs.push({ id: doc.id, ...doc.data() } as WorkoutLog);
      });
      logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      callback(logs);
    }, (error) => {
      console.error("Error subscribing to logs:", error);
    });
    return unsubscribe;
  }
};