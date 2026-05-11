import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Backend, { AVATARS } from '../lib/backend';
import FirebaseSync from '../lib/firebase';

const GlobalContext = createContext();
export function useGlobal() { return useContext(GlobalContext); }

export function GlobalProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [chats, setChats] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [music, setMusic] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [pendingEmail, setPendingEmail] = useState(null);
  const [permissions, setPermissions] = useState({ microphone: false, contacts: false });
  const [socialVersion, setSocialVersion] = useState(0);

  const [globalToast, setGlobalToast] = useState(null);

  // ── Init: restore session ──
  useEffect(() => {
    Backend.init();
    const saved = Backend.auth.getSession();
    if (saved) setUser(saved);
    setChats(Backend.chats.getAll());
    setRooms(Backend.rooms.getAll());
    setMusic(Backend.music.get());
    setNotifications(Backend.notifs.getAll());
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
  }, []);

  // ── Auth ──
  const signup = async (username, email, password) => {
    // Create local account directly (skip OTP)
    const { user: u } = await Backend.auth.signupDirect(username, email, password, false);
    // Sync to Firebase
    if (FirebaseSync.isReady()) {
      await FirebaseSync.signUp(email, password).catch(() => {});
      await FirebaseSync.saveUser(u).catch(() => {});
    }
    setUser(u);
    refreshAll();
    return u;
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
    // 1. Try Firebase Auth first if ready
    if (FirebaseSync.isReady()) {
      try {
        // Find user email first (needed for Firebase Sign In)
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
        let email = isEmail ? identifier : null;
        
        if (!email) {
          const u = (Backend.auth.getAllUsers()).find(x => x.username.toLowerCase() === identifier.toLowerCase());
          email = u?.email;
        }

        if (email) {
          const fbUser = await FirebaseSync.signIn(email, password);
          if (fbUser) {
            // Firebase Auth succeeded! Now get/sync the local user
            const u = await Backend.auth.login(identifier, password, true); // Pass true to skip local password check
            setUser(u);
            refreshAll();
            await FirebaseSync.saveUser(u).catch(() => {});
            return u;
          }
        }
      } catch (err) {
        // If Firebase explicitly says "wrong password", we should stop here
        if (err.message.includes('password') || err.message.includes('auth/wrong-password')) {
          throw new Error('Incorrect password');
        }
        // For other errors (like user not found in Firebase), fall back to local login
      }
    }

    // 2. Fallback to local login
    const u = await Backend.auth.login(identifier, password);
    setUser(u);
    refreshAll();
    return u;
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

  // Google signup: user already authenticated with Google, now creating account with username + password
  const signupWithGoogle = async (username, email, password) => {
    // Create local account directly (skip OTP since Google verified email)
    const { user: u } = await Backend.auth.signupDirect(username, email, password, true);
    // Sync to Firebase
    if (FirebaseSync.isReady()) {
      await FirebaseSync.signUp(email, password).catch(() => {});
      await FirebaseSync.saveUser(u).catch(() => {});
    }
    setUser(u);
    refreshAll();
    return u;
  };

  const logout = () => {
    Backend.auth.logout();
    FirebaseSync.signOutUser().catch(() => {});
    setUser(null);
  };

  const updateProfile = (updates) => {
    if (!user) return;
    const updated = Backend.auth.updateProfile(user.uid, updates);
    if (updated) {
      setUser({ ...updated });
      // Sync to Firebase so changes persist across devices/sessions
      if (FirebaseSync.isReady()) {
        FirebaseSync.saveUser(updated).catch(() => {});
      }
    }
  };

  const isAuthenticated = !!user;

  // ── Permissions ──
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
      // Fallback: simulate permission granted
      setPermissions(p => ({ ...p, contacts: true }));
      return [];
    } catch { return []; }
  };

  // ── Data refresh ──
  const refreshAll = useCallback(() => {
    setChats(Backend.chats.getAll());
    setRooms(Backend.rooms.getAll());
    setMusic(Backend.music.get());
    setNotifications(Backend.notifs.getAll());
  }, []);

  const refreshChats = useCallback(() => setChats(Backend.chats.getAll()), []);

  const getMessages = useCallback((id) => Backend.chats.getMessages(id), []);

  const sendMessage = useCallback((chatId, text) => {
    const msg = Backend.chats.sendMessage(chatId, text);
    refreshChats();
    return msg;
  }, [refreshChats]);

  const markChatRead = useCallback((id) => { Backend.chats.markRead(id); refreshChats(); }, [refreshChats]);
  const deleteChat = useCallback((id) => { Backend.chats.deleteChat(id); refreshChats(); }, [refreshChats]);

  // Instagram-style methods
  const createOrGetDM = useCallback((toUserId) => {
    if (!user) return null;
    const result = Backend.chats.createOrGetDM(user.uid, toUserId);
    refreshChats();
    return result.chatId;
  }, [user, refreshChats]);

  const getRegularChats = useCallback(() => {
    if (!user) return [];
    return Backend.chats.getRegularChats(user.uid);
  }, [user, chats]); // Re-evaluate when chats array changes

  const getIncomingMessageRequests = useCallback(() => {
    if (!user) return [];
    return Backend.chats.getIncomingMessageRequests(user.uid);
  }, [user, chats]);

  const acceptMessageRequest = useCallback((chatId) => {
    const success = Backend.chats.acceptMessageRequest(chatId);
    if (success) refreshChats();
    return success;
  }, [refreshChats]);

  const deleteMessageRequest = useCallback((chatId) => {
    Backend.chats.deleteMessageRequest(chatId);
    refreshChats();
  }, [refreshChats]);

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
      user, isAuthLoading, isAuthenticated, pendingEmail,
      signup, signupWithGoogle, verifyOtp, resendOtp, login, loginWithGoogle, logout, updateProfile,
      permissions, requestMicrophone, requestContacts,
      chats, refreshChats, getMessages, sendMessage, markChatRead, deleteChat,
      createOrGetDM, getRegularChats, getIncomingMessageRequests, acceptMessageRequest, deleteMessageRequest,
      rooms, refreshRooms, joinRoom, leaveRoom, createRoom,
      music, toggleMusic, skipTrack, joinMusicSession, addToQueue,
      notifications, unreadNotifCount, markNotificationsRead, markNotificationRead,
      getInsights, timeAgo: Backend.timeAgo, socialVersion,
      globalToast, setGlobalToast
    }}>
      {children}
    </GlobalContext.Provider>
  );
}
