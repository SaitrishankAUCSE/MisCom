import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup,
  onAuthStateChanged,
  sendEmailVerification,
  updateProfile,
  deleteUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  getDocs,
  query,
  where,
  serverTimestamp,
  onSnapshot,
  deleteDoc
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyALsXuYdXkuOAMHgaM6Ap8M5HW3nmZwbzE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "miscom-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "miscom-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "miscom-app.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "524446179930",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:524446179930:web:88834cfdf4f12f12742e63",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-2X5F7322PM"
};

let app, auth, db, googleProvider;
let firebaseReady = false;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
  // Test if Firebase is configured with real credentials
  firebaseReady = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== 'dummy_api_key';
} catch (err) {
  console.warn('[MisCom] Firebase init failed, using local backend:', err.message);
  firebaseReady = false;
}

/**
 * Firebase Sync Layer
 * Syncs user data to Firestore when real Firebase credentials are provided.
 * Falls back gracefully to local backend when using dummy keys.
 */
const FirebaseSync = {
  isReady() { return firebaseReady; },

  // Save user profile to Firestore
  async saveUser(userData) {
    if (!firebaseReady || !db) return;
    try {
      // Use Firebase Auth UID as document key if available, otherwise app UID
      const docId = (auth?.currentUser?.uid) || userData.uid;
      await Promise.race([
        setDoc(doc(db, 'users', docId), {
          appUid: userData.uid || '',
          username: userData.username || '',
          email: userData.email || '',
          name: userData.name || '',
          avatar: userData.avatar || '',
          aura: userData.aura || '',
          bio: userData.bio || '',
          interests: userData.interests || [],
          musicGenres: userData.musicGenres || [],
          onboardingCompleted: userData.onboardingCompleted || false,
          createdAt: userData.createdAt || serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 5000))
      ]);
      console.log('[MisCom] User synced to Firebase');
    } catch (err) {
      if (err.message.includes('NOT_FOUND') || err.message.includes('not-found')) {
        console.error('[MisCom] CRITICAL: Firestore Database "(default)" NOT FOUND. Please initialize it in the Firebase Console.');
      } else {
        console.warn('[MisCom] Firebase sync failed:', err.message);
      }
    }
  },

  // Get user from Firestore
  async getUser(uid) {
    if (!firebaseReady || !db) return null;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      return snap.exists() ? snap.data() : null;
    } catch { return null; }
  },

  // Check if a user exists by email or username
  async getUserByIdentifier(identifier) {
    if (!firebaseReady || !db) return null;
    try {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where(isEmail ? 'email' : 'username', '==', isEmail ? identifier.toLowerCase() : identifier));
      
      const snap = await Promise.race([
        getDocs(q),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase timeout')), 5000))
      ]);
      
      if (!snap.empty) {
        return snap.docs[0].data();
      }
      return null;
    } catch (err) {
      console.warn('[MisCom] Firebase lookup failed:', err.message);
      return null;
    }
  },

  // Search users directly from Firestore (fallback when local data is stale)
  async searchUsers(queryStr, currentUserId) {
    if (!firebaseReady || !db || !queryStr || queryStr.length < 2) return [];
    try {
      const snap = await Promise.race([
        getDocs(collection(db, 'users')),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase search timeout')), 5000))
      ]);
      
      const q = queryStr.toLowerCase();
      const results = [];
      snap.docs.forEach(d => {
        const data = d.data();
        const u = { uid: data.appUid || d.id, ...data };
        if ((u.username || '').toLowerCase().includes(q) ||
            (u.name || '').toLowerCase().includes(q)) {
          results.push({
            uid: u.uid, username: u.username, name: u.name,
            avatar: u.avatar, aura: u.aura, bio: u.bio
          });
        }
      });
      
      // Also merge these users into localStorage so future local searches find them
      const localUsers = JSON.parse(localStorage.getItem('miscom_users') || '[]');
      let changed = false;
      snap.docs.forEach(d => {
        const data = d.data();
        const remoteUser = { uid: data.appUid || d.id, ...data };
        if (!localUsers.find(lu => lu.uid === remoteUser.uid || lu.username === remoteUser.username)) {
          localUsers.push(remoteUser);
          changed = true;
        }
      });
      if (changed) localStorage.setItem('miscom_users', JSON.stringify(localUsers));
      
      return results;
    } catch (err) {
      console.warn('[MisCom] Firebase search failed:', err.message);
      return [];
    }
  },

  // Update user profile in Firestore
  async updateUser(uid, updates) {
    if (!firebaseReady || !db) return;
    try {
      await updateDoc(doc(db, 'users', uid), { ...updates, updatedAt: serverTimestamp() });
    } catch (err) {
      console.warn('[MisCom] Firebase update failed:', err.message);
    }
  },

  // Firebase Auth: sign up
  async signUp(email, password) {
    if (!firebaseReady || !auth) return null;
    try {
      const cred = await Promise.race([
        createUserWithEmailAndPassword(auth, email, password),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase Auth timeout')), 8000))
      ]);
      return cred.user;
    } catch (err) {
      console.warn('[MisCom] Firebase signup failed:', err.message);
      throw err;
    }
  },

  // Firebase Auth: sign in
  async signIn(email, password) {
    if (!firebaseReady || !auth) return null;
    try {
      const cred = await Promise.race([
        signInWithEmailAndPassword(auth, email, password),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase Auth timeout')), 8000))
      ]);
      return cred.user;
    } catch (err) {
      console.warn('[MisCom] Firebase signin failed:', err.message);
      throw err;
    }
  },

  // Firebase Auth: Google sign in
  async signInWithGoogle() {
    if (!firebaseReady || !auth || !googleProvider) return null;
    try {
      const cred = await Promise.race([
        signInWithPopup(auth, googleProvider),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Google Sign-in timeout')), 15000))
      ]);
      return cred.user;
    } catch (err) {
      console.error('[MisCom] Google sign-in failed:', err.message);
      throw err; // Rethrow to allow UI to catch and display the error
    }
  },

  // Firebase Auth: sign out
  async signOutUser() {
    if (!firebaseReady || !auth) return;
    try { await signOut(auth); } catch {}
  },

  // Firebase Auth & Firestore: Delete completely
  async deleteAccount() {
    if (!firebaseReady || !auth || !auth.currentUser) return;
    try {
      const uid = auth.currentUser.uid;
      // Delete user from Firestore
      if (db) {
        await deleteDoc(doc(db, 'users', uid));
        await deleteDoc(doc(db, 'friends', uid));
      }
      // Delete from Firebase Auth
      await deleteUser(auth.currentUser);
    } catch (e) {
      console.error("Error deleting Firebase account:", e);
    }
  },

  // ── SOCIAL (Firestore Writes) ──
  async sendVibeRequest(req) {
    if (!firebaseReady || !db) return;
    try { await setDoc(doc(db, 'friend_requests', req.id), req); } catch (e) { console.error(e); }
  },

  async updateVibeRequest(reqId, status) {
    if (!firebaseReady || !db) return;
    try { await updateDoc(doc(db, 'friend_requests', reqId), { status }); } catch (e) { console.error(e); }
  },

  async deleteVibeRequest(reqId) {
    if (!firebaseReady || !db) return;
    try { await deleteDoc(doc(db, 'friend_requests', reqId)); } catch (e) { console.error(e); }
  },

  async updateFriendsList(userId, friendsList) {
    if (!firebaseReady || !db) return;
    try { await setDoc(doc(db, 'friends', userId), { friends: friendsList }, { merge: true }); } catch (e) { console.error(e); }
  },

  // ── REALTIME GLOBAL SYNC ──
  // Fetches latest data from Firestore and hydrates the local localStorage so backend.js works across devices
  startRealtimeSync(uid, onUpdate) {
    if (!firebaseReady || !db) return () => {};

    // Sync all users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const remoteUsers = snap.docs.map(d => {
        const data = d.data();
        return { uid: data.appUid || d.id, ...data };
      });
      const localUsers = JSON.parse(localStorage.getItem('miscom_users') || '[]');
      
      // Merge: remote users take precedence, but keep local ones that aren't in remote yet
      // CRITICAL FIX: Do not let remote overwrite local onboardingCompleted=true with false
      const merged = remoteUsers.map(ru => {
        const lu = localUsers.find(x => x.uid === ru.uid || x.username === ru.username);
        if (lu && lu.onboardingCompleted && !ru.onboardingCompleted) {
          return { ...ru, onboardingCompleted: true };
        }
        return ru;
      });
      
      localUsers.forEach(lu => {
        if (!merged.find(ru => ru.uid === lu.uid || ru.username === lu.username)) {
          merged.push(lu);
        }
      });

      localStorage.setItem('miscom_users', JSON.stringify(merged));
      if (onUpdate) onUpdate();
    });

    // Sync friend requests relevant to the current user (incoming or outgoing)
    const unsubRequests = onSnapshot(collection(db, 'friend_requests'), (snap) => {
      const allRequests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Filter locally for now as Firestore complex "OR" queries require multiple indexes
      const myRequests = allRequests.filter(r => r.to === uid || r.from === uid);
      localStorage.setItem('miscom_friend_requests', JSON.stringify(myRequests));
      if (onUpdate) onUpdate();
    });

    // Sync all friends mapping
    const unsubFriends = onSnapshot(collection(db, 'friends'), (snap) => {
      const friendsData = {};
      snap.docs.forEach(d => { friendsData[d.id] = d.data().friends || []; });
      localStorage.setItem('miscom_friends', JSON.stringify(friendsData));
      if (onUpdate) onUpdate();
    });

    return () => {
      unsubUsers();
      unsubRequests();
      unsubFriends();
    };
  },
};

export { auth, db, googleProvider, FirebaseSync };
export default FirebaseSync;
