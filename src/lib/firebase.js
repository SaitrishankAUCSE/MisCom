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
  deleteUser,
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
  deleteDoc
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

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
  const functions = getFunctions(app);
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
            (u.displayName || '').toLowerCase().includes(q) ||
            (u.name || '').toLowerCase().includes(q)) {
          results.push({
            uid: u.uid, 
            username: u.username, 
            displayName: u.displayName || u.name || u.username,
            name: u.name,
            avatar: u.avatar, 
            aura: u.aura, 
            bio: u.bio
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
      const functions = getFunctions(app);
      const wipeFunc = httpsCallable(functions, 'deleteUserAccount');
      const result = await wipeFunc();
      return result.data;
    } catch (e) {
      console.error("Error wiping Firebase account:", e);
      throw e;
    }
  },

  /**
   * Reauthenticate user before sensitive operations
   */
  async reauthenticate(password) {
    if (!auth?.currentUser) return false;
    try {
      const user = auth.currentUser;
      const isGoogle = user.providerData.some(p => p.providerId === 'google.com');
      
      if (isGoogle) {
        const provider = new GoogleAuth();
        await signInWithPopup(auth, provider);
        return true;
      } else {
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
        return true;
      }
    } catch (err) {
      console.error('Reauthentication failed:', err);
      throw err;
    }
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
      await setDoc(doc(db, 'chat_meta', chatId), chatData, { merge: true });
    } catch (e) { console.error(e); }
  },

  // Accept a vibe request in Firebase
  async acceptVibeChat(chatId) {
    if (!firebaseReady || !db) return;
    try {
      await updateDoc(doc(db, 'chat_meta', chatId), { isRequest: false, requestAccepted: true });
    } catch (e) { console.error(e); }
  },

  // Delete a vibe request chat from Firebase
  async deleteVibeChat(chatId) {
    if (!firebaseReady || !db) return;
    try {
      await deleteDoc(doc(db, 'chat_meta', chatId));
    } catch (e) { console.error(e); }
  },

  listenMessages(chatId, onUpdate) {
    if (!firebaseReady || !db) return () => {};
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

    // Sync vibe requests relevant to the current user (incoming or outgoing)
    const unsubVibeRequests = onSnapshot(collection(db, 'vibe_requests'), (snap) => {
      const allRequests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const myRequests = allRequests.filter(r => r.to === uid || r.from === uid);
      localStorage.setItem('miscom_vibe_requests', JSON.stringify(myRequests));
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
    const unsubChatMeta = onSnapshot(collection(db, 'chat_meta'), (snap) => {
      const allChatMeta = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Only keep chats where the current user is a participant
      const myChats = allChatMeta.filter(c => c.participants && c.participants.includes(uid));
      
      // Merge into local chats
      const localChats = JSON.parse(localStorage.getItem('miscom_chats') || '[]');
      let changed = false;
      let newToast = null;
      
      myChats.forEach(rc => {
        const existingIdx = localChats.findIndex(lc => lc.id === rc.id);
        if (existingIdx !== -1) {
          const old = localChats[existingIdx];
          // Check if there is a new message from someone else
          if (rc.lastMessageTime > old.lastMessageTime && rc.lastSenderId !== uid) {
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
          if (rc.isRequest && !rc.requestAccepted && rc.requestFrom !== uid) {
            newToast = {
              title: 'New Vibe Request',
              body: `${rc.senderName || rc.name || 'Someone'} wants to vibe with you`,
              avatar: rc.senderAvatar || rc.avatar,
              link: `/chats`,
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
      unsubRequests();
      unsubFriends();
      unsubChatMeta();
      unsubNotifs();
    };
  },

  // ── ACCOUNT LIFECYCLE ──
  async reauthenticate(password) {
    if (!auth.currentUser) throw new Error('No user logged in');
    const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
    return await reauthenticateWithCredential(auth.currentUser, credential);
  },

  async deleteAccount() {
    if (!firebaseReady || !auth.currentUser) return;
    try {
      // Call the Cloud Function for deep cleanup (if deployed)
      const functions = getFunctions();
      const deleteFunc = httpsCallable(functions, 'deleteUserAccount');
      await deleteFunc();
      
      // Also delete from Auth client-side
      await deleteUser(auth.currentUser);
    } catch (e) {
      console.error('Delete account error:', e);
      // Fallback: If function fails (e.g. not deployed), try to just delete auth user
      if (auth.currentUser) {
        await deleteUser(auth.currentUser).catch(() => {});
      }
      throw e;
    }
  },

  async globalNuke(secret) {
    if (!firebaseReady) return;
    try {
      const functions = getFunctions();
      const nukeFn = httpsCallable(functions, 'globalNuke');
      const result = await nukeFn({ secret });
      return result.data;
    } catch (e) { 
      console.error('Global nuke error:', e); 
      throw e; 
    }
  }
};

export { auth, db, googleProvider, FirebaseSync };
export default FirebaseSync;
