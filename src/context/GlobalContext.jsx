import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Backend, { AVATARS } from '../lib/backend';
import FirebaseSync from '../lib/firebase';

const GlobalContext = createContext();
export function useGlobal() { return useContext(GlobalContext); }

export function GlobalProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [chats, setChats] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [music, setMusic] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [pendingEmail, setPendingEmail] = useState(null);
  const [permissions, setPermissions] = useState({ microphone: false, contacts: false });
  const [socialVersion, setSocialVersion] = useState(0);

  const [globalToast, setGlobalToast] = useState(null);

  // ── Theme (dark/light) ──
  const [theme, setThemeState] = useState(() => {
    const savedTheme = localStorage.getItem('miscom_theme');
    if (savedTheme) return savedTheme;
    try {
      const appearance = JSON.parse(localStorage.getItem('miscom_appearance') || '{}');
      return appearance.theme || 'light';
    } catch { return 'light'; }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('miscom_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  const setTheme = useCallback((t) => {
    setThemeState(t);
  }, []);

  const refreshAll = useCallback(() => {
    setChats(Backend.chats.getAll());
    setRooms(Backend.rooms.getAll());
    setMusic(Backend.music.get());
    setNotifications(Backend.notifs.getAll());
    
    // Fetch vibe requests from local storage (synced from Cloud by startRealtimeSync)
    const storedVibes = JSON.parse(localStorage.getItem('miscom_vibe_requests') || '[]');
    setVibeRequests(storedVibes);
  }, []);

  const logout = useCallback(() => {
    Backend.auth.logout();
    FirebaseSync.signOutUser().catch(() => {});
    setUser(null);
    setProfile(null);
    // Aggressively clear local cache keys to ensure a fresh state
    const keysToClear = [
      'miscom_session', 'miscom_users', 'miscom_chats', 
      'miscom_messages', 'miscom_vibe_requests', 'miscom_message_requests',
      'miscom_rooms', 'miscom_notifs'
    ];
    keysToClear.forEach(k => localStorage.removeItem(k));
    setVibeRequests([]);
    refreshAll();
  }, [refreshAll]);

  // ── Init: restore session ──
  useEffect(() => {
    Backend.init();
    const saved = Backend.auth.getSession();
    if (saved) {
      setUser(saved);
      // Fetch Firestore profile to verify session is still valid in the cloud
      if (FirebaseSync.isReady()) {
        FirebaseSync.getUser(saved.uid).then(p => {
          if (p) {
            setProfile(p);
          } else {
            // User exists locally but NOT in cloud (was nuked or deleted)
            console.warn('[GlobalContext] Session user not found in cloud. Clearing local session.');
            logout();
          }
        }).catch(() => {
          // If we can't reach the cloud, we stay logged in locally for offline support
        });
      }
    }
    refreshAll(); // This now handles chats, rooms, music, and vibe requests
    setIsAuthLoading(false);

    if (saved && FirebaseSync.isReady()) {
      FirebaseSync.saveUser(saved).catch(() => {});
    }

    // ── Start Realtime Sync ──
    if (FirebaseSync.isReady()) {
      const unsub = FirebaseSync.startRealtimeSync(saved?.uid, (toastPayload) => {
        // Force refresh components that rely on local storage
        if (saved) setUser({ ...Backend.auth.getSession() });
        setSocialVersion(v => v + 1);
        refreshAll();
        
        // Show in-app notification if we got a payload and we aren't already looking at it
        if (toastPayload) {
          // If we are already on the chat page for this message, don't show the toast
          const isCurrentChat = window.location.pathname === toastPayload.link;
          if (!isCurrentChat) {
            setGlobalToast(toastPayload);
            // Auto hide after 4 seconds
            setTimeout(() => setGlobalToast(null), 4000);
          }
        }
      });
      return () => unsub();
    }
  }, [logout, refreshAll]);

  // ── Auth ──
  const signup = async (username, email, password) => {
    if (FirebaseSync.isReady()) {
      // 1. Create Firebase Auth user FIRST to get the official UID
      const fbUser = await FirebaseSync.signUp(email, password);
      
      // 2. Use that official UID for the local profile
      const { user: u } = await Backend.auth.signupDirect(username, email, password, false, fbUser.uid);
      
      // 3. Standardize and sync to cloud
      u.displayName = u.name; // Standardize
      await FirebaseSync.saveUser(u).catch(() => {});
      
      setUser(u);
      setProfile(u); // Hydrate profile immediately
      refreshAll();
      return u;
    }
    throw new Error('Firebase not initialized');
  };

  const verifyOtp = async (code) => {
    const verified = await Backend.auth.verifyOtp(code);
    if (verified) {
      setUser(verified);
      refreshAll();
    }
    return verified;
  };

  const resendOtp = async () => {
    return await Backend.auth.resendOtp();
  };

  const login = async (identifier, password) => {
    // Strict Firebase Auth Flow
    if (FirebaseSync.isReady()) {
      try {
        let email = identifier.trim();
        
        // Mapping: If identifier is a username, find the email
        if (!email.includes('@')) {
          const allUsers = Backend.auth.getAllUsers();
          const found = allUsers.find(x => (x.username || '').toLowerCase() === email.toLowerCase());
          if (found && found.email) {
            email = found.email;
          } else {
            // Check cloud if not found locally
            const cloudUser = await FirebaseSync.getUserByIdentifier(email);
            if (cloudUser && cloudUser.email) {
              email = cloudUser.email;
            } else {
              throw new Error('User not found. Please check your username.');
            }
          }
        }

        const fbUser = await FirebaseSync.signIn(email, password);
        if (fbUser) {
          // Auth succeeded! Hydrate profile
          let u = Backend.auth.getAllUsers().find(x => x.uid === fbUser.uid);
          
          if (!u) {
            const cloudProfile = await FirebaseSync.getUser(fbUser.uid);
            if (cloudProfile) {
              Backend.auth.restoreUser(cloudProfile);
              u = cloudProfile;
            } else {
              throw new Error('Profile synchronization failed. Please try again.');
            }
          }

          // Force local session state sync
          await Backend.auth.login(u.email, password, true); 
          setUser(u);
          setProfile(u); // Hydrate profile immediately
          refreshAll();
          return u;
        }
      } catch (err) {
        // Detailed error reporting for the user
        let friendlyMsg = err.message;
        if (err.code === 'auth/user-not-found') friendlyMsg = 'No account exists with this email.';
        if (err.code === 'auth/wrong-password') friendlyMsg = 'Incorrect password.';
        if (err.code === 'auth/invalid-email') friendlyMsg = 'Please enter a valid email address.';
        throw new Error(friendlyMsg);
      }
    }
    throw new Error('Authentication service is offline. Please try again later.');
  };

  const loginWithGoogle = async () => {
    // Login only — reject if no account exists
    if (FirebaseSync.isReady()) {
      const fbUser = await FirebaseSync.signInWithGoogle();
      if (fbUser) {
        let result;
        try {
          // preventCreation = true: only login existing users
          result = await Backend.auth.loginWithGoogle(fbUser.email, fbUser.displayName, true);
        } catch (err) {
          await FirebaseSync.signOutUser().catch(() => {});
          throw err;
        }
        let { user: u } = result;
        u.name = fbUser.displayName || u.name;
        u.avatar = fbUser.photoURL || u.avatar;
        u.email = fbUser.email || u.email;
        Backend.auth.updateProfile(u.uid, u);
        await FirebaseSync.saveUser(u).catch(() => {});
        setUser(u);
        refreshAll();
        return u;
      }
      throw new Error('Google Sign-In was cancelled');
    }
    throw new Error('Firebase not configured');
  };

  const continueWithGoogle = async () => {
    if (!FirebaseSync.isReady()) throw new Error('Firebase not initialized');
    
    // 1. Open Popup immediately (user-initiated)
    const fbUser = await FirebaseSync.signInWithGoogle();
    if (!fbUser) return null;

    try {
      // 2. Try to Login first
      const result = await Backend.auth.loginWithGoogle(fbUser.email, fbUser.displayName, true);
      const { user: u } = result;
      
      // Update from Google data
      u.name = fbUser.displayName || u.name;
      u.avatar = fbUser.photoURL || u.avatar;
      u.email = fbUser.email || u.email;
      
      Backend.auth.updateProfile(u.uid, u);
      await FirebaseSync.saveUser(u).catch(() => {});
      
      setUser(u);
      setProfile(u);
      refreshAll();
      return { type: 'login', user: u };
    } catch (err) {
      // 3. If login failed because no account exists, we transition to Signup
      if (err.message.includes('No account exists')) {
        // Prepare suggested username
        const suggested = fbUser.email.split('@')[0].replace(/[^a-z0-9_]/g, '').toLowerCase().slice(0, 15);
        const status = await Backend.auth.checkUsername(suggested);
        
        if (status === 'available') {
          // AUTO-SIGNUP: Create account instantly
          const { user: u } = await Backend.auth.signupDirect(suggested, fbUser.email, 'google_authenticated', true, fbUser.uid);
          u.displayName = fbUser.displayName || suggested;
          u.avatar = fbUser.photoURL || '';
          
          await FirebaseSync.saveUser(u).catch(() => {});
          setUser(u);
          setProfile(u);
          refreshAll();
          return { type: 'signup_complete', user: u };
        } else {
          // MANUAL-SIGNUP required: Return the user info so the UI can pre-fill
          return { 
            type: 'signup_required', 
            googleUser: fbUser,
            suggestedUsername: suggested
          };
        }
      }
      throw err;
    }
  };

  const signupWithGoogle = async (username, email, password) => {
    if (FirebaseSync.isReady()) {
      // For Google, we already have a user in Firebase auth, but we need to create the profile
      const fbUser = FirebaseSync.getCurrentUser();
      if (!fbUser) throw new Error('No Google session found');

      const { user: u } = await Backend.auth.signupDirect(username, email, password, true, fbUser.uid);
      u.displayName = fbUser.displayName || u.name;
      u.avatar = fbUser.photoURL || u.avatar;
      
      await FirebaseSync.saveUser(u).catch(() => {});
      setUser(u);
      setProfile(u); // Hydrate profile immediately
      refreshAll();
      return u;
    }
    throw new Error('Firebase not initialized');
  };

  const updateProfile = async (updates) => {
    if (!user) return;
    const updated = Backend.auth.updateProfile(user.uid, updates);
    if (updated) {
      setUser({ ...updated });
      setProfile(prev => ({ ...prev, ...updates }));
      if (FirebaseSync.isReady()) {
        await FirebaseSync.saveUser(updated).catch(() => {});
      }
    }
  };

  const refreshProfile = async () => {
    if (!user || !FirebaseSync.isReady()) return;
    const p = await FirebaseSync.getUser(user.uid);
    if (p) setProfile(p);
  };

  const deleteAccount = async (password) => {
    if (!user) return;
    if (FirebaseSync.isReady()) {
      try {
        await FirebaseSync.reauthenticate(password);
        await FirebaseSync.deleteAccount();
      } catch (err) {
        console.error('[GlobalContext] Cloud deletion failed:', err);
        throw err;
      }
    }
    logout();
    Object.keys(localStorage)
      .filter(key => key.startsWith('miscom_'))
      .forEach(key => localStorage.removeItem(key));
    setUser(null);
    setProfile(null);
    window.location.assign('/auth-choice');
  };

  const isAuthenticated = !!user;

  const requestMicrophone = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissions(p => ({ ...p, microphone: true }));
      return true;
    } catch { return false; }
  };

  const requestContacts = async () => {
    try {
      if ('contacts' in navigator && 'ContactsManager' in window) {
        const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: true });
        setPermissions(p => ({ ...p, contacts: true }));
        return contacts;
      }
      setPermissions(p => ({ ...p, contacts: true }));
      return [];
    } catch { return []; }
  };

  const refreshChats = useCallback(() => setChats(Backend.chats.getAll()), []);
  const getMessages = useCallback((id) => Backend.chats.getMessages(id), []);
  const sendMessage = useCallback((chatId, text) => {
    const msg = Backend.chats.sendMessage(chatId, text);
    refreshChats();
    return msg;
  }, [refreshChats]);

  const markChatRead = useCallback((id) => { Backend.chats.markRead(id); refreshChats(); }, [refreshChats]);
  const deleteChat = useCallback((id) => { Backend.chats.deleteChat(id); refreshChats(); }, [refreshChats]);

  const createOrGetDM = useCallback((toUserId) => {
    if (!user) return null;
    const result = Backend.chats.createOrGetDM(user.uid, toUserId);
    refreshChats();
    return result.chatId;
  }, [user, refreshChats]);

  const getRegularChats = useCallback(() => {
    if (!user) return [];
    return Backend.chats.getRegularChats(user.uid);
  }, [user, chats]);

  const getIncomingMessageRequests = useCallback(() => {
    if (!user) return [];
    return JSON.parse(localStorage.getItem('miscom_message_requests') || '[]')
      .filter(r => r.receiverId === user.uid && r.status === 'pending');
  }, [user, socialVersion]);

  const acceptMessageRequest = useCallback((chatId) => {
    if (String(chatId).startsWith('mr-')) {
      Backend.social.acceptMessageRequest(user?.uid, chatId);
      setSocialVersion(v => v + 1);
      return true;
    }
    const success = Backend.chats.acceptMessageRequest(chatId);
    if (success) refreshChats();
    return success;
  }, [refreshChats, user?.uid]);

  const deleteMessageRequest = useCallback((chatId) => {
    if (String(chatId).startsWith('mr-')) {
      Backend.social.rejectMessageRequest(user?.uid, chatId);
      setSocialVersion(v => v + 1);
      return;
    }
    Backend.chats.deleteMessageRequest(chatId);
    refreshChats();
  }, [refreshChats, user?.uid]);

  const [vibeRequests, setVibeRequests] = useState([]);

  const getVibeRequests = useCallback(() => {
    return vibeRequests;
  }, [vibeRequests]);

  const acceptVibeRequest = useCallback(async (requestId) => {
    if (!user) return;
    const res = await Backend.social.acceptRequest(user.uid, requestId);
    setSocialVersion(v => v + 1);
    return res;
  }, [user]);

  const rejectVibeRequest = useCallback(async (requestId) => {
    if (!user) return;
    const res = await Backend.social.declineRequest(user.uid, requestId);
    setSocialVersion(v => v + 1);
    return res;
  }, [user]);

  const sendMessageRequest = useCallback(async (toUserId, message) => {
    if (!user) return;
    return await Backend.social.sendMessageRequest(user.uid, toUserId, message);
  }, [user]);

  const refreshRooms = useCallback(() => setRooms(Backend.rooms.getAll()), []);
  const joinRoom = useCallback((id) => { Backend.rooms.join(id); refreshRooms(); }, [refreshRooms]);
  const leaveRoom = useCallback((id) => { Backend.rooms.leave(id); refreshRooms(); }, [refreshRooms]);
  const createRoom = useCallback((d) => { const r = Backend.rooms.create(d); refreshRooms(); return r; }, [refreshRooms]);

  const toggleMusic = useCallback(() => { setMusic(Backend.music.togglePlay()); }, []);
  const skipTrack = useCallback(() => { setMusic(Backend.music.skip()); }, []);
  const joinMusicSession = useCallback(() => { setMusic(Backend.music.joinSession()); }, []);
  const addToQueue = useCallback((t) => { setMusic(Backend.music.addToQueue(t)); }, []);

  const markNotificationsRead = useCallback(() => { setNotifications(Backend.notifs.markAllRead()); }, []);
  const markNotificationRead = useCallback((id) => { setNotifications(Backend.notifs.markRead(id)); }, []);
  const unreadNotifCount = notifications.filter(n => !n.read).length;

  const getInsights = useCallback(() => Backend.insights.generate(), []);

  return (
    <GlobalContext.Provider value={{
      user, profile, isAuthLoading, isAuthenticated, pendingEmail,
      signup, signupWithGoogle, verifyOtp, resendOtp, login, loginWithGoogle, logout, updateProfile, refreshProfile, deleteAccount,
      permissions, requestMicrophone, requestContacts,
      chats, refreshChats, getMessages, sendMessage, markChatRead, deleteChat,
      createOrGetDM, getRegularChats, getIncomingMessageRequests, acceptMessageRequest, deleteMessageRequest,
      getVibeRequests, acceptVibeRequest, rejectVibeRequest, sendMessageRequest,
      rooms, refreshRooms, joinRoom, leaveRoom, createRoom,
      music, toggleMusic, skipTrack, joinMusicSession, addToQueue,
      notifications, unreadNotifCount, markNotificationsRead, markNotificationRead,
      getInsights, timeAgo: Backend.timeAgo, socialVersion,
      globalToast, setGlobalToast,
      theme, toggleTheme, setTheme
    }}>
      {children}
    </GlobalContext.Provider>
  );
}
