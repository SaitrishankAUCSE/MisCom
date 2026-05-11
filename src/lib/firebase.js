import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider as GoogleAuth
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
  orderBy,
  serverTimestamp,
  onSnapshot,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  limit
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const requiredFirebaseEnv = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

const missingFirebaseEnv = requiredFirebaseEnv.filter(key => !import.meta.env[key]);

const firebaseConfig = missingFirebaseEnv.length ? null : {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

let app, auth, db, storage, googleProvider;
let firebaseReady = false;

try {
  if (!firebaseConfig) {
    throw new Error(`Missing Firebase env vars: ${missingFirebaseEnv.join(', ')}`);
  }
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  googleProvider = new GoogleAuthProvider();
  firebaseReady = true;
  console.log('[MisCom] Firebase Production Engine Initialized');
} catch (err) {
  console.warn('[MisCom] Firebase Initialization Error:', err.message);
}


/**
 * Firebase Sync Layer
 * Syncs user data to Firestore when real Firebase credentials are provided.
 * Falls back gracefully to local backend when using dummy keys.
 */
const FirebaseSync = {
  isReady() { return firebaseReady; },
  getCurrentUser() { return auth?.currentUser || null; },
  getConfig() { return firebaseConfig ? { ...firebaseConfig } : null; },

  // Save user profile to Firestore
  async saveUser(userData) {
    if (!firebaseReady || !db) return;
    try {
      const docId = (auth?.currentUser?.uid) || userData.uid;
      
      // 1. Public Profile (NO sensitive data)
      const publicData = {
        ...userData,
        normalizedUsername: (userData.username || '').toLowerCase(),
        displayName: userData.displayName || userData.name || userData.username,
        onlineStatus: 'online',
        lastSeen: serverTimestamp(),
        avatar: userData.avatar || '',
        aura: userData.aura || '',
        bio: userData.bio || '',
        onboardingCompleted: userData.onboardingCompleted || false,
        updatedAt: serverTimestamp()
      };
      // Explicitly delete sensitive fields
      delete publicData.email;
      delete publicData.password;

      // 2. Private Profile (Accessible only to owner)
      const privateData = {
        email: userData.email || '',
        updatedAt: serverTimestamp()
      };

      await Promise.race([
        Promise.all([
          setDoc(doc(db, 'users', docId), publicData, { merge: true }),
          setDoc(doc(db, 'users', docId, 'private', 'info'), privateData, { merge: true })
        ]),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 5000))
      ]);
      console.log('[MisCom] User profile synced (email protected)');
    } catch (err) {
      console.warn('[MisCom] Firebase sync failed:', err.message);
    }
  },

  async updatePresence(uid, status = 'online') {
    if (!firebaseReady || !db || !uid) return;
    try {
      await updateDoc(doc(db, 'users', uid), {
        onlineStatus: status,
        lastSeen: serverTimestamp()
      });
    } catch (e) { console.warn('Presence update failed:', e); }
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

  // Search users using Firestore queries (not client-side filtering of entire collection)
  // Note: Firestore has no full-text search, so this still does client-side filtering
  // For production, consider using Algolia or ElasticSearch
  async searchUsers(queryStr, currentUserId) {
    if (!firebaseReady || !db || !queryStr || queryStr.length < 2) return [];
    try {
      // Query users with matching normalized username prefix
      const normalizedQuery = (queryStr || '').trim().toLowerCase();
      const q = query(
        collection(db, 'users'), 
        where('normalizedUsername', '>=', normalizedQuery),
        where('normalizedUsername', '<=', `${normalizedQuery}\uf8ff`),
        limit(20) // Limit to 20 results to avoid pulling entire collection
      );
      
      const snap = await Promise.race([
        getDocs(q),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase search timeout')), 5000))
      ]);
      
      const results = snap.docs.map(d => {
        const data = d.data();
        return {
          uid: data.appUid || d.id, 
          username: data.username, 
          displayName: data.displayName || data.name || data.username,
          avatar: data.avatar, 
          aura: data.aura, 
          bio: data.bio
        };
      });
      
      return results;
    } catch (err) {
      console.warn('[MisCom] Firebase search failed:', err.message);
      return [];
    }
  },
  
  async checkEmailRegistered(email) {
    if (!firebaseReady || !db || !email) return false;
    try {
      const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()), limit(1));
      const snap = await getDocs(q);
      return !snap.empty;
    } catch (err) {
      console.error('[FirebaseSync] Email check failed:', err);
      return false;
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

  // ── SOCIAL (Firestore Writes) ──
  async sendVibeRequest(req) {
    if (!firebaseReady || !db) return;
    try { await setDoc(doc(db, 'vibe_requests', req.id), req); } catch (e) { console.error(e); }
  },

  async updateVibeRequest(reqId, status) {
    if (!firebaseReady || !db) return;
    try { await updateDoc(doc(db, 'vibe_requests', reqId), { status }); } catch (e) { console.error(e); }
  },

  async deleteVibeRequest(reqId) {
    if (!firebaseReady || !db) return;
    try { await deleteDoc(doc(db, 'vibe_requests', reqId)); } catch (e) { console.error(e); }
  },

  async updateFriendsList(userId, friendsList) {
    if (!firebaseReady || !db) return;
    try { await setDoc(doc(db, 'friends', userId), { friends: friendsList }, { merge: true }); } catch (e) { console.error(e); }
  },

  // ── MESSAGE REQUESTS ──
  async sendMessageRequest(req) {
    if (!firebaseReady || !db) return;
    try { await setDoc(doc(db, 'message_requests', req.id), req); } catch (e) { console.error(e); }
  },

  async updateMessageRequest(reqId, status) {
    if (!firebaseReady || !db) return;
    try { await updateDoc(doc(db, 'message_requests', reqId), { status }); } catch (e) { console.error(e); }
  },

  // ── BLOCKING ──
  async blockUser(userId, blockId) {
    if (!firebaseReady || !db) return;
    try {
      await setDoc(doc(db, 'blocked_users', userId), { 
        blocked: arrayUnion(blockId) 
      }, { merge: true });
    } catch (e) { console.error(e); }
  },

  async unblockUser(userId, blockId) {
    if (!firebaseReady || !db) return;
    try {
      await updateDoc(doc(db, 'blocked_users', userId), { 
        blocked: arrayRemove(blockId) 
      });
    } catch (e) { console.error(e); }
  },

  async reportUser(report) {
    if (!firebaseReady || !db || !auth?.currentUser) return;
    try {
      const reportId = report.id || `report-${Date.now()}`;
      await setDoc(doc(db, 'reports', reportId), {
        ...report,
        reporterId: auth.currentUser.uid,
        status: 'open',
        createdAt: serverTimestamp()
      });
    } catch (e) { console.error(e); }
  },

  async sendMessage(chatId, msg) {
    if (!firebaseReady || !db) return;
    try {
      const msgRef = doc(collection(db, 'chats', chatId, 'messages'), msg.id);
      await setDoc(msgRef, msg);
    } catch (e) { console.error(e); }
  },

  // Save chat metadata so both users can see the conversation
  async saveChatMeta(chatId, chatData) {
    if (!firebaseReady || !db) return;
    try {
      await setDoc(doc(db, 'chats', chatId), {
        ...chatData,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) { console.error(e); }
  },

  // Accept a vibe request in Firebase
  async acceptVibeChat(chatId) {
    if (!firebaseReady || !db) return;
    try {
      await updateDoc(doc(db, 'chats', chatId), { 
        chatType: 'direct',
        requestStatus: 'accepted',
        updatedAt: serverTimestamp()
      });
    } catch (e) { console.error(e); }
  },

  // Delete a vibe request chat from Firebase
  async deleteVibeChat(chatId) {
    if (!firebaseReady || !db) return;
    try {
      await deleteDoc(doc(db, 'chats', chatId));
    } catch (e) { console.error(e); }
  },

  listenMessages(chatId, onUpdate) {
    if (!firebaseReady || !db || !chatId) return () => {};
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'));
    return onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => d.data());
      onUpdate(msgs);
    });
  },

  async updateMessageStatus(chatId, msgId, status) {
    if (!firebaseReady || !db) return;
    try {
      await updateDoc(doc(db, 'chats', chatId, 'messages', msgId), { status });
    } catch (e) { console.error(e); }
  },

  // ── REALTIME GLOBAL SYNC ──
  // Fetches latest data from Firestore and hydrates the local localStorage so backend.js works across devices
  startRealtimeSync(uid, onUpdate) {
    if (!firebaseReady || !db || !uid) return () => {};

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

    // Sync vibe requests relevant to the current user (incoming or outgoing)
    const unsubVibeRequests = onSnapshot(collection(db, 'vibe_requests'), async (snap) => {
      const rawRequests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const myRawRequests = rawRequests.filter(r => r.to === uid || r.from === uid);
      
      // Hydrate fromUser profile if missing (backward compatibility or deep sync)
      const hydrated = await Promise.all(myRawRequests.map(async r => {
        if (r.to === uid && !r.fromUser) {
          const profile = await this.getUser(r.from);
          if (profile) return { ...r, fromUser: profile };
        }
        return r;
      }));

      localStorage.setItem('miscom_vibe_requests', JSON.stringify(hydrated));
      if (onUpdate) onUpdate();
    });

    // Sync message requests relevant to the current user
    const unsubMsgRequests = onSnapshot(collection(db, 'message_requests'), (snap) => {
      const allRequests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const myRequests = allRequests.filter(r => r.receiverId === uid || r.senderId === uid);
      localStorage.setItem('miscom_message_requests', JSON.stringify(myRequests));
      if (onUpdate) onUpdate();
    });

    // Sync current user's friends list
    const unsubFriends = onSnapshot(doc(db, 'friends', uid), (snap) => {
      if (snap.exists()) {
        const friendsMap = JSON.parse(localStorage.getItem('miscom_friends') || '{}');
        friendsMap[uid] = snap.data().friends || [];
        localStorage.setItem('miscom_friends', JSON.stringify(friendsMap));
        if (onUpdate) onUpdate();
      }
    });

    // Sync chat metadata (vibe requests + active chats)
    const unsubChats = onSnapshot(collection(db, 'chats'), (snap) => {
      const allChats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Only keep chats where the current user is a participant
      const myChats = allChats.filter(c => c.participants && c.participants.includes(uid));
      
      // Merge into local chats
      const localChats = JSON.parse(localStorage.getItem('miscom_chats') || '[]');
      let changed = false;
      let newToast = null;
      
      myChats.forEach(rc => {
        const existingIdx = localChats.findIndex(lc => lc.id === rc.id);
        if (existingIdx !== -1) {
          const old = localChats[existingIdx];
          // Check if there is a new message from someone else
          if (rc.lastTimestamp > (old.lastTimestamp || 0) && rc.lastSenderId !== uid) {
            newToast = {
              title: rc.senderName || rc.name || 'New Message',
              body: rc.lastMessage,
              avatar: rc.senderAvatar || rc.avatar,
              link: `/chat/${rc.id}`,
            };
          }
          // Update existing chat with Firebase data
          localChats[existingIdx] = { ...old, ...rc };
        } else {
          // New chat from Firebase — add it
          localChats.unshift(rc);
          changed = true;
          // Check if it's a new vibe request directed at us
          if (rc.chatType === 'request' && rc.requestStatus === 'pending' && rc.requestFrom !== uid) {
            newToast = {
              title: 'New Vibe Request',
              body: `${rc.senderName || rc.name || 'Someone'} wants to vibe with you`,
              avatar: rc.senderAvatar || rc.avatar,
              link: `/requests`,
            };
          }
        }
      });
      
      if (changed || myChats.length > 0) {
        localStorage.setItem('miscom_chats', JSON.stringify(localChats));
        if (onUpdate) onUpdate(newToast);
      }
    });

    // Sync notifications feed
    const unsubNotifs = onSnapshot(collection(db, `notifications/${uid}/user_notifs`), (snap) => {
      const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort by newest first
      notifs.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      localStorage.setItem('miscom_notifs', JSON.stringify(notifs));
      if (onUpdate) onUpdate();
    });

    return () => {
      unsubUsers();
      unsubVibeRequests();
      unsubMsgRequests();
      unsubFriends();
      unsubChats();
      unsubNotifs();
    };
  },

  // ── ACCOUNT LIFECYCLE ──
  async reauthenticate(password) {
    if (!auth?.currentUser) throw new Error('No user logged in');
    const user = auth.currentUser;
    const isGoogle = user.providerData.some(p => p.providerId === 'google.com');

    if (isGoogle) {
      const provider = new GoogleAuth();
      return await signInWithPopup(auth, provider);
    }

    const credential = EmailAuthProvider.credential(user.email, password);
    return await reauthenticateWithCredential(user, credential);
  },

  async sendPasswordReset(email) {
    if (!firebaseReady || !auth || !email) return;
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      console.warn('[MisCom] Firebase password reset failed:', err.message);
      throw err;
    }
  },

  async changePassword(currentPassword, newPassword) {
    if (!firebaseReady || !auth?.currentUser) throw new Error('No user logged in');
    await this.reauthenticate(currentPassword);
    await updatePassword(auth.currentUser, newPassword);
  },

  async deleteAccount() {
    if (!firebaseReady || !auth?.currentUser) return;
    try {
      const functions = getFunctions(app);
      const deleteFunc = httpsCallable(functions, 'deleteUserAccount');
      const result = await deleteFunc();
      return result.data;
    } catch (e) {
      console.error('Delete account error:', e);
      throw e;
    }
  },

  async globalNuke(secret) {
    if (!firebaseReady) return;
    try {
      const functions = getFunctions(app);
      const nukeFn = httpsCallable(functions, 'globalNuke');
      const result = await nukeFn({ secret });
      return result.data;
    } catch (e) { 
      console.error('Global nuke error:', e); 
      throw e; 
    }
  }
};

export { auth, db, storage, googleProvider, FirebaseSync };
export default FirebaseSync;
