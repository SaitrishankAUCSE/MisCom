import emailjs from '@emailjs/browser';
import FirebaseSync from './firebase';

const KEYS = {
  USERS: 'miscom_users',
  SESSION: 'miscom_session',
  CHATS: 'miscom_chats',
  MESSAGES: 'miscom_messages',
  ROOMS: 'miscom_rooms',
  MUSIC: 'miscom_music',
  NOTIFICATIONS: 'miscom_notifs',
  MEMORIES: 'miscom_memories',
  OTP_PENDING: 'miscom_otp_pending',
  SETTINGS: 'miscom_settings',
  LOGIN_ACTIVITY: 'miscom_login_activity',
  BLOCKED: 'miscom_blocked',
  MUTED: 'miscom_muted',
  PROTECTED_ROOMS: 'miscom_protected_rooms',
  PROTECTED_MESSAGES: 'miscom_protected_msgs',
  PROTECTED_MEMBERS: 'miscom_protected_members',
  ROOM_STREAKS: 'miscom_room_streaks',
  ROOM_JOIN_ATTEMPTS: 'miscom_room_join_attempts',
  FRIENDS: 'miscom_friends',
  FRIEND_REQUESTS: 'miscom_friend_requests',
  MESSAGE_REQUESTS: 'miscom_message_requests',
};

const AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Taylor',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Casey',
];

// ── Helpers ──
function get(k, fb) { try { const d = localStorage.getItem(k); return d ? JSON.parse(d) : fb; } catch { return fb; } }
function set(k, d) { try { localStorage.setItem(k, JSON.stringify(d)); } catch {} }
function uid() { return 'u' + Date.now() + Math.random().toString(36).slice(2, 8); }
function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60000) return 'Just now';
  if (d < 3600000) return `${Math.floor(d/60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d/3600000)}h ago`;
  return `${Math.floor(d/86400000)}d ago`;
}

// ── Validation ──
const V = {
  username(u) {
    if (!u || u.length < 3) return 'Username must be at least 3 characters';
    if (u.length > 20) return 'Username must be 20 characters or less';
    if (/\s/.test(u)) return 'Username cannot contain spaces';
    if (!/^[A-Za-z0-9_]+$/.test(u)) return 'Only letters, numbers, and underscore allowed';
    const users = get(KEYS.USERS, []);
    if (users.find(x => (x.username || '').toLowerCase() === (u || '').toLowerCase())) return 'Username is already taken';
    return null;
  },
  email(e) {
    if (!e) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return 'Invalid email format';
    const users = get(KEYS.USERS, []);
    if (users.find(x => (x.email || '').toLowerCase() === (e || '').toLowerCase())) return 'Email is already registered';
    return null;
  },
  password(p) {
    if (!p || p.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(p)) return 'Must contain an uppercase letter';
    if (!/[a-z]/.test(p)) return 'Must contain a lowercase letter';
    if (!/[0-9]/.test(p)) return 'Must contain a number';
    if (!/[^A-Za-z0-9]/.test(p)) return 'Must contain a special character';
    return null;
  },
  passwordStrength(p) {
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s; // 0-4
  },
  isEmail(input) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input); },
};

// ── Simple hash (not crypto-secure, but simulates hashing) ──
function simpleHash(str) {
  if (!str) return '';
  const clean = str.trim(); // Remove accidental spaces
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    const c = clean.charCodeAt(i);
    hash = ((hash << 5) - hash) + c;
    hash |= 0; // Force to 32bit integer
  }
  return 'h' + Math.abs(hash).toString(36) + clean.length;
}

// ── Auto-reply pool ──
const AUTO_REPLIES = [
  "Haha that's awesome! 😄","No way! Tell me more 👀","Literally same 💀",
  "Okay but that's actually fire 🔥","Brb dying 😂","Slay 💅✨",
  "You're so right about that","Omg yes!! 🙌","Wait what?? 😱",
  "Lol you're too funny","That's what I'm saying!","Periodt 💯",
  "Bestie you get me 🥺","No because why is this so relatable","Send me that!! 📲",
];

// ── Seed Data ──
const SEED_CHATS = [];
const SEED_MESSAGES = {};
const SEED_ROOMS = [];
const SEED_MUSIC = null;
const SEED_NOTIFS = [];

// ══════════════════════════════════════
// BACKEND SERVICE
// ══════════════════════════════════════
const Backend = {
  init() {
    // Ensure all keys exist with safe defaults if missing
    if (!get(KEYS.USERS, null)) set(KEYS.USERS, []);
    if (!get(KEYS.CHATS, null)) set(KEYS.CHATS, SEED_CHATS);
    if (!get(KEYS.MESSAGES, null)) set(KEYS.MESSAGES, SEED_MESSAGES);
    if (!get(KEYS.ROOMS, null)) set(KEYS.ROOMS, SEED_ROOMS);
    if (!get(KEYS.MUSIC, null)) set(KEYS.MUSIC, SEED_MUSIC);
    if (!get(KEYS.NOTIFICATIONS, null)) set(KEYS.NOTIFICATIONS, SEED_NOTIFS);
    if (!get(KEYS.FRIENDS, null)) set(KEYS.FRIENDS, {});
    if (!get(KEYS.FRIEND_REQUESTS, null)) set(KEYS.FRIEND_REQUESTS, []);
  },

  // ── AUTH ──
  auth: {
    getAllUsers() {
      return get(KEYS.USERS, []);
    },

    signupDirect(username, email, password, isGoogleUser = false) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            const uErr = V.username(username);
            if (uErr) return reject(new Error(uErr));
            const eErr = V.email(email);
            if (eErr) return reject(new Error(eErr));
            const pErr = V.password(password);
            if (pErr) return reject(new Error(pErr));

            const users = get(KEYS.USERS, []);
            if (users.find(u => (u.email || '').toLowerCase() === (email || '').toLowerCase())) return reject(new Error('Email already registered'));
            if (users.find(u => (u.username || '').toLowerCase() === (username || '').toLowerCase())) return reject(new Error('Username taken'));

            const newUser = {
              uid: uid(), username, email: email.toLowerCase(),
              passwordHash: simpleHash(password),
              avatar: AVATARS[Math.floor(Math.random()*AVATARS.length)],
              name: username, aura: '✨ Creating', bio: '',
              interests: [], musicGenres: [],
              verified: true, // Auto-verify since they used Google
              createdAt: Date.now(),
              streakDays: 0, socialEnergy: 50,
              isGoogleUser
            };
            users.push(newUser);
            set(KEYS.USERS, users);
            
            // Auto log in
            const token = uid() + '-' + Date.now();
            set(KEYS.SESSION, { uid: newUser.uid, token, loginAt: Date.now() });

            resolve({ user: newUser });
          } catch (e) {
            reject(e);
          }
        }, 800);
      });
    },

    signup(username, email, password) {
      return new Promise((resolve, reject) => {
        setTimeout(async () => {
          try {
            const uErr = V.username(username);
            if (uErr) return reject(new Error(uErr));
            const eErr = V.email(email);
            if (eErr) return reject(new Error(eErr));
            const pErr = V.password(password);
            if (pErr) return reject(new Error(pErr));

            const users = get(KEYS.USERS, []);
            const otp = String(Math.floor(100000 + Math.random() * 900000));
            const newUser = {
              uid: uid(), username, email: email.toLowerCase(),
              passwordHash: simpleHash(password),
              avatar: AVATARS[Math.floor(Math.random()*AVATARS.length)],
              name: username, aura: '✨ Creating', bio: '',
              interests: [], musicGenres: [],
              verified: false, createdAt: Date.now(),
              streakDays: 0, socialEnergy: 50,
            };
            users.push(newUser);
            set(KEYS.USERS, users);
            set(KEYS.OTP_PENDING, { visitorUid: newUser.uid, otp, email: newUser.email, attempts: 0, expiresAt: Date.now() + 120000 });
            
            // Try sending actual email if EmailJS is configured
            if (import.meta.env.VITE_EMAILJS_SERVICE_ID) {
              try {
                await emailjs.send(
                  import.meta.env.VITE_EMAILJS_SERVICE_ID,
                  import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
                  { to_email: email, to_name: username, otp_code: otp },
                  import.meta.env.VITE_EMAILJS_PUBLIC_KEY
                );
                console.log(`[MisCom] OTP securely sent to ${email}`);
              } catch (err) {
                console.error('[MisCom] Failed to send email via EmailJS:', err);
              }
            } else {
              console.warn(`[MisCom] VITE_EMAILJS_SERVICE_ID missing. Fallback OTP for ${email}: ${otp}`);
            }

            resolve({ user: newUser, otp });
          } catch (e) {
            reject(e);
          }
        }, 800);
      });
    },

    requestPasswordReset(identifier) {
      return new Promise((resolve, reject) => {
        setTimeout(async () => {
          try {
            if (!identifier) return reject(new Error('Please enter your email or username.'));
            const isEmail = V.isEmail(identifier);
            let users = get(KEYS.USERS, []);
            
            // Check local storage first
            let user = users.find(u =>
              isEmail ? u.email.toLowerCase() === identifier.toLowerCase()
                      : u.username.toLowerCase() === identifier.toLowerCase()
            );

            // If not found locally, check Firebase directly
            if (!user && FirebaseSync.isReady()) {
              const fbUser = await FirebaseSync.getUserByIdentifier(identifier);
              if (fbUser) {
                user = fbUser;
                // Sync down to local storage so resetPassword works
                users.push(user);
                set(KEYS.USERS, users);
              }
            }

            if (!user) return reject(new Error(isEmail ? 'No account found with this email.' : 'User does not exist.'));

            const otp = String(Math.floor(100000 + Math.random() * 900000));
            set('miscom_reset_pending', { uid: user.uid, email: user.email, otp, attempts: 0, expiresAt: Date.now() + 120000 });

            // Send EmailJS
            if (import.meta.env.VITE_EMAILJS_SERVICE_ID) {
              try {
                await emailjs.send(
                  import.meta.env.VITE_EMAILJS_SERVICE_ID,
                  import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
                  { to_email: user.email, to_name: user.username, otp_code: otp },
                  import.meta.env.VITE_EMAILJS_PUBLIC_KEY
                );
              } catch (err) {
                console.error('[MisCom] Password Reset EmailJS Error:', err);
              }
            } else {
              console.warn(`[MisCom] Dev Mode Reset OTP for ${user.email}: ${otp}`);
            }
            resolve({ email: user.email });
          } catch (e) {
            reject(new Error('Network error. Please try again.'));
          }
        }, 800);
      });
    },

    verifyResetOtp(code) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const pending = get('miscom_reset_pending', null);
          if (!pending) return reject(new Error('No pending reset.'));
          if (pending.attempts >= 5) return reject(new Error('Too many attempts.'));
          if (Date.now() > pending.expiresAt) return reject(new Error('OTP expired.'));

          pending.attempts++;
          set('miscom_reset_pending', pending);

          if (code !== pending.otp) {
            return reject(new Error('Invalid OTP.'));
          }

          resolve(true);
        }, 600);
      });
    },

    resetPassword(newPassword) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const pending = get('miscom_reset_pending', null);
          if (!pending) return reject(new Error('Session expired.'));
          
          const pErr = V.password(newPassword);
          if (pErr) return reject(new Error(pErr));

          const users = get(KEYS.USERS, []);
          const idx = users.findIndex(u => u.uid === pending.uid);
          if (idx !== -1) {
            users[idx].passwordHash = simpleHash(newPassword);
            set(KEYS.USERS, users);
            localStorage.removeItem('miscom_reset_pending');
            resolve();
          } else {
            reject(new Error('User not found.'));
          }
        }, 800);
      });
    },

    verifyOtp(code) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const pending = get(KEYS.OTP_PENDING, null);
          if (!pending) return reject(new Error('No pending verification'));
          if (pending.attempts >= 5) return reject(new Error('Too many attempts. Please request a new code.'));
          if (Date.now() > pending.expiresAt) return reject(new Error('Code expired. Please request a new code.'));

          pending.attempts++;
          set(KEYS.OTP_PENDING, pending);

          if (code !== pending.otp) {
            return reject(new Error(`Invalid code. ${5 - pending.attempts} attempts remaining.`));
          }

          const users = get(KEYS.USERS, []);
          const idx = users.findIndex(u => u.uid === pending.visitorUid);
          if (idx !== -1) { 
            users[idx].verified = true; 
            set(KEYS.USERS, users); 
            const token = uid() + '-' + Date.now();
            set(KEYS.SESSION, { uid: users[idx].uid, token, loginAt: Date.now() });
          }
          localStorage.removeItem(KEYS.OTP_PENDING);
          resolve(users[idx]);
        }, 600);
      });
    },

    async resendOtp() {
      const pending = get(KEYS.OTP_PENDING, null);
      if (!pending) return null;
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      pending.otp = otp; pending.attempts = 0; pending.expiresAt = Date.now() + 120000;
      set(KEYS.OTP_PENDING, pending);
      
      if (import.meta.env.VITE_EMAILJS_SERVICE_ID) {
        try {
          const users = get(KEYS.USERS, []);
          const u = users.find(x => x.uid === pending.visitorUid);
          await emailjs.send(
            import.meta.env.VITE_EMAILJS_SERVICE_ID,
            import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
            { to_email: pending.email, to_name: u?.username || 'User', otp_code: otp },
            import.meta.env.VITE_EMAILJS_PUBLIC_KEY
          );
          console.log(`[MisCom] Resent OTP securely sent to ${pending.email}`);
        } catch (err) {
          console.error('[MisCom] Failed to resend email via EmailJS:', err);
        }
      } else {
        console.warn(`[MisCom] New OTP: ${otp}`);
      }
      
      return otp;
    },

    login(identifier, password, skipPasswordCheck = false) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (!identifier) return reject(new Error('Please enter your username or email'));
          if (!skipPasswordCheck && !password) return reject(new Error('Please enter your password'));

          const cleanId = (identifier || '').trim();
          const users = get(KEYS.USERS, []);
          const isEmail = V.isEmail(cleanId);
          const user = users.find(u =>
            isEmail ? (u.email || '').toLowerCase() === cleanId.toLowerCase()
                    : (u.username || '').toLowerCase() === cleanId.toLowerCase()
          );

          if (!user) return reject(new Error(isEmail ? 'No account found with this email' : 'User not found'));
          
          // Auto-verify if they are logging in
          if (!user.verified) {
            user.verified = true;
            const uIdx = users.findIndex(x => x.uid === user.uid);
            if (uIdx !== -1) {
              users[uIdx].verified = true;
              set(KEYS.USERS, users);
            }
          }

          if (!skipPasswordCheck && user.passwordHash !== simpleHash(password)) {
            return reject(new Error('Incorrect password'));
          }

          const token = uid() + '-' + Date.now();
          set(KEYS.SESSION, { uid: user.uid, token, loginAt: Date.now() });
          resolve(user);
        }, 800);
      });
    },

    loginWithGoogle(email = 'user@gmail.com', displayName = 'Alex', preventCreation = false) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            const users = get(KEYS.USERS, []);
            const searchEmail = (email || '').toLowerCase();
            let user = users.find(u => u.email === searchEmail);
            if (!user && preventCreation) {
               return reject(new Error('Account not found. Please sign up with Google first.'));
            }
            let isNewUser = false;
            if (!user) {
              isNewUser = true;
              user = {
                uid: uid(), username: (searchEmail.split('@')[0] || 'user').replace(/[^a-z0-9_]/g, ''), email: searchEmail, passwordHash: simpleHash('google-oauth'),
                avatar: AVATARS[Math.floor(Math.random()*AVATARS.length)], name: displayName || 'User', aura: '🔥 On Fire', bio: '',
                interests: [], musicGenres: [], verified: true, createdAt: Date.now(),
                streakDays: 0, socialEnergy: 50, isGoogleUser: true,
              };
              users.push(user); set(KEYS.USERS, users);
            }
            const token = uid() + '-' + Date.now();
            set(KEYS.SESSION, { uid: user.uid, token, loginAt: Date.now() });
            resolve({ user, isNewUser });
          } catch (e) {
            reject(e);
          }
        }, 800);
      });
    },

    getSession() {
      const session = get(KEYS.SESSION, null);
      if (!session) return null;
      const users = get(KEYS.USERS, []);
      return users.find(u => u.uid === session.uid) || null;
    },

    updateProfile(uid2, updates) {
      const users = get(KEYS.USERS, []);
      const idx = users.findIndex(u => u.uid === uid2);
      if (idx !== -1) { Object.assign(users[idx], updates); set(KEYS.USERS, users); return users[idx]; }
      return null;
    },

    logout() { 
      localStorage.removeItem(KEYS.SESSION);
      localStorage.removeItem(KEYS.USERS);
      localStorage.removeItem(KEYS.CHATS);
      localStorage.removeItem(KEYS.MESSAGES);
      localStorage.removeItem(KEYS.ROOMS);
      localStorage.removeItem(KEYS.NOTIFICATIONS);
      localStorage.removeItem(KEYS.FRIENDS);
      localStorage.removeItem(KEYS.FRIEND_REQUESTS);
      localStorage.removeItem(KEYS.MESSAGE_REQUESTS);
      localStorage.removeItem('miscom_recent_searches');
    },

    isAuthenticated() { return !!get(KEYS.SESSION, null); },

    checkUsername(u) {
      if (!u || u.length < 3) return 'idle';
      if (u.length > 20 || /\s/.test(u) || !/^[A-Za-z0-9_]+$/.test(u)) return 'invalid';
      const users = get(KEYS.USERS, []);
      return users.find(x => x.username.toLowerCase() === u.toLowerCase()) ? 'taken' : 'available';
    },

    checkEmail(e) {
      if (!e || !V.isEmail(e)) return false;
      const users = get(KEYS.USERS, []);
      // Check if any existing user has this email
      return !users.some(x => (x.email || '').toLowerCase() === e.toLowerCase());
    },
  },

  // ── CHATS ──
  chats: {
    getAll() { return get(KEYS.CHATS, SEED_CHATS); },
    getById(id) { return this.getAll().find(c => c.id === id); },
    getMessages(id) { return (get(KEYS.MESSAGES, SEED_MESSAGES))[id] || []; },
    sendMessage(chatId, text) {
      const msgs = get(KEYS.MESSAGES, SEED_MESSAGES);
      const msg = { id: uid(), sender:'me', text, timestamp:Date.now(), type:'text' };
      if (!msgs[chatId]) msgs[chatId] = [];
      msgs[chatId].push(msg); set(KEYS.MESSAGES, msgs);
      const chats = this.getAll();
      const i = chats.findIndex(c => c.id === chatId);
      if (i !== -1) { chats[i].lastMessage = text; chats[i].lastMessageTime = Date.now(); chats[i].typing = false; set(KEYS.CHATS, chats); }
      return msg;
    },
    autoReply(chatId) {
      return new Promise(resolve => {
        setTimeout(() => {
          const msgs = get(KEYS.MESSAGES, SEED_MESSAGES);
          const chat = this.getById(chatId);
          const reply = { id: uid(), sender: chat?.contactId || 'friend', text: AUTO_REPLIES[Math.floor(Math.random()*AUTO_REPLIES.length)], timestamp:Date.now(), type:'text' };
          if (!msgs[chatId]) msgs[chatId] = [];
          msgs[chatId].push(reply); set(KEYS.MESSAGES, msgs);
          const chats = this.getAll();
          const i = chats.findIndex(c => c.id === chatId);
          if (i !== -1) { chats[i].lastMessage = reply.text; chats[i].lastMessageTime = Date.now(); set(KEYS.CHATS, chats); }
          resolve(reply);
        }, 1500 + Math.random()*2000);
      });
    },
    markRead(id) { const c = this.getAll(); const i = c.findIndex(x => x.id === id); if (i !== -1) { c[i].unread = 0; c[i].typing = false; set(KEYS.CHATS, c); } },
    deleteChat(id) { set(KEYS.CHATS, this.getAll().filter(c => c.id !== id)); const m = get(KEYS.MESSAGES, {}); delete m[id]; set(KEYS.MESSAGES, m); },

    // Instagram-style: create or get a DM chat. If not friends, mark as message request.
    createOrGetDM(fromUserId, toUserId) {
      const chatId = 'chat-' + [fromUserId, toUserId].sort().join('-');
      const chats = this.getAll();
      const existing = chats.find(c => c.id === chatId);
      if (existing) return { chatId, isNew: false, isRequest: !!existing.isRequest };

      // Check if they are friends
      const friends = get(KEYS.FRIENDS, {});
      const isFriend = (friends[fromUserId] || []).includes(toUserId);

      const users = get(KEYS.USERS, []);
      const toUser = users.find(u => u.uid === toUserId);
      const fromUser = users.find(u => u.uid === fromUserId);

      // Create chat for the sender
      const newChat = {
        id: chatId,
        contactId: toUserId,
        name: toUser?.name || toUser?.username || 'User',
        avatar: toUser?.avatar || null,
        lastMessage: '',
        lastMessageTime: Date.now(),
        unread: 0,
        online: false,
        typing: false,
        isGroup: false,
        isRequest: !isFriend,
        requestFrom: fromUserId,
        requestAccepted: isFriend,
      };
      chats.unshift(newChat);
      set(KEYS.CHATS, chats);

      // Init empty messages
      const msgs = get(KEYS.MESSAGES, {});
      if (!msgs[chatId]) { msgs[chatId] = []; set(KEYS.MESSAGES, msgs); }

      return { chatId, isNew: true, isRequest: !isFriend };
    },

    // Get all message requests (chats from non-friends that haven't been accepted)
    getMessageRequests(userId) {
      const chats = this.getAll();
      return chats.filter(c => c.isRequest && !c.requestAccepted && c.contactId !== userId && c.requestFrom !== userId);
    },

    // Get all message requests TO this user (where someone messaged them)
    getIncomingMessageRequests(userId) {
      const chats = this.getAll();
      return chats.filter(c => {
        if (!c.isRequest || c.requestAccepted) return false;
        // The request is incoming if the requestFrom is NOT the current user
        // i.e., someone else initiated the chat
        return c.requestFrom && c.requestFrom !== userId;
      });
    },

    // Accept a message request — promotes it to a normal chat
    acceptMessageRequest(chatId) {
      const chats = this.getAll();
      const idx = chats.findIndex(c => c.id === chatId);
      if (idx !== -1) {
        chats[idx].isRequest = false;
        chats[idx].requestAccepted = true;
        set(KEYS.CHATS, chats);
        return true;
      }
      return false;
    },

    // Delete/decline a message request
    deleteMessageRequest(chatId) {
      this.deleteChat(chatId);
    },

    // Get regular chats (non-request or accepted)
    getRegularChats(userId) {
      const chats = this.getAll();
      return chats.filter(c => {
        if (!c.isRequest) return true;
        if (c.requestAccepted) return true;
        // Show the chat to the sender (requestFrom) so they can see their sent message
        if (c.requestFrom === userId) return true;
        return false;
      });
    },
  },

  // ── ROOMS (legacy vibe rooms) ──
  rooms: {
    getAll() { return get(KEYS.ROOMS, SEED_ROOMS); },
    join(id) { const r = this.getAll(); const i = r.findIndex(x => x.id === id); if (i !== -1) { r[i].joined = true; r[i].listeners++; set(KEYS.ROOMS, r); } },
    leave(id) { const r = this.getAll(); const i = r.findIndex(x => x.id === id); if (i !== -1) { r[i].joined = false; r[i].listeners = Math.max(0, r[i].listeners-1); set(KEYS.ROOMS, r); } },
    create(data) { const r = this.getAll(); const n = { id: uid(), ...data, listeners:1, joined:true, createdAt:Date.now() }; r.unshift(n); set(KEYS.ROOMS, r); return n; },
  },

  // ── PROTECTED ROOMS ──
  protectedRooms: {
    _ANON_ALIASES: ['NeonGhost','ShadowPulse','SilentAura','MidnightEcho','GlowSpectre','VoidWalker','PhantomVibe','CosmicDrift','VelvetHaze','NovaSpark','LunarWhisper','EmberShade','CrystalMist','OceanDream','TwilightFox'],
    _CATEGORIES: ['Friends','Gaming','Study','Music','Relationship','Anime','Night Talks','College','Private Circle'],
    _MOODS: ['🔥 Lit','🌙 Chill','💜 Vibes','⚡ Hype','🎧 Music','📚 Focus','🎮 Gaming','💫 Dreamy','🌊 Calm','🖤 Dark'],

    getAll() { return get(KEYS.PROTECTED_ROOMS, []); },
    getById(id) { return this.getAll().find(r => r.id === id); },
    getMyRooms(userId) { return this.getAll().filter(r => r.creatorId === userId || (r.members || []).includes(userId)); },
    getPublicRooms() { return this.getAll().filter(r => r.privacy === 'public' && !this._isExpired(r)); },

    _isExpired(room) {
      if (!room.expiry) return false;
      return Date.now() > room.expiresAt;
    },

    create(data, creatorId) {
      const rooms = this.getAll();
      const room = {
        id: 'pr-' + uid(),
        name: data.name,
        description: data.description || '',
        category: data.category || 'Friends',
        mood: data.mood || '🔥 Lit',
        themeColor: data.themeColor || '#E11D48',
        maxMembers: data.maxMembers || 50,
        privacy: data.privacy || 'private',
        passwordHash: data.password ? simpleHash(data.password) : null,
        isPasswordProtected: !!data.password,
        anonymousMode: data.anonymousMode || false,
        ghostJoinEnabled: data.ghostJoinEnabled || false,
        expiry: data.expiry || null,
        expiresAt: data.expiry ? Date.now() + data.expiry : null,
        creatorId,
        members: [creatorId],
        admins: [creatorId],
        bannedUsers: [],
        mutedUsers: [],
        streak: 0,
        lastActivity: Date.now(),
        memberCount: 1,
        createdAt: Date.now(),
      };
      rooms.unshift(room);
      set(KEYS.PROTECTED_ROOMS, rooms);
      // Init messages
      const msgs = get(KEYS.PROTECTED_MESSAGES, {});
      msgs[room.id] = [{ id: uid(), type: 'system', text: `${data.name} was created ✨`, timestamp: Date.now() }];
      set(KEYS.PROTECTED_MESSAGES, msgs);
      return room;
    },

    joinRoom(roomId, userId, password = null) {
      const rooms = this.getAll();
      const idx = rooms.findIndex(r => r.id === roomId);
      if (idx === -1) return { success: false, error: 'Room not found' };
      const room = rooms[idx];

      if (this._isExpired(room)) return { success: false, error: 'This room has expired' };
      if (room.bannedUsers.includes(userId)) return { success: false, error: 'You are banned from this room' };
      if (room.members.includes(userId)) return { success: true, alreadyMember: true };
      if (room.members.length >= room.maxMembers) return { success: false, error: 'Room is full' };

      // Brute-force protection
      if (room.isPasswordProtected) {
        const attempts = get(KEYS.ROOM_JOIN_ATTEMPTS, {});
        const key = `${roomId}_${userId}`;
        const record = attempts[key] || { count: 0, lastAttempt: 0 };
        if (record.count >= 5 && Date.now() - record.lastAttempt < 300000) {
          return { success: false, error: 'Too many attempts. Try again in 5 minutes.' };
        }
        if (!password || simpleHash(password) !== room.passwordHash) {
          record.count = (Date.now() - record.lastAttempt > 300000) ? 1 : record.count + 1;
          record.lastAttempt = Date.now();
          attempts[key] = record;
          set(KEYS.ROOM_JOIN_ATTEMPTS, attempts);
          return { success: false, error: 'Incorrect password', attemptsLeft: 5 - record.count };
        }
        // Reset on success
        delete attempts[key];
        set(KEYS.ROOM_JOIN_ATTEMPTS, attempts);
      }

      room.members.push(userId);
      room.memberCount = room.members.length;
      rooms[idx] = room;
      set(KEYS.PROTECTED_ROOMS, rooms);

      // System message
      if (!room.ghostJoinEnabled) {
        const msgs = get(KEYS.PROTECTED_MESSAGES, {});
        if (!msgs[roomId]) msgs[roomId] = [];
        const session = Backend.auth.getSession();
        const name = session?.name || 'Someone';
        msgs[roomId].push({ id: uid(), type: 'system', text: `${name} joined the room`, timestamp: Date.now() });
        set(KEYS.PROTECTED_MESSAGES, msgs);
      }
      return { success: true };
    },

    leaveRoom(roomId, userId) {
      const rooms = this.getAll();
      const idx = rooms.findIndex(r => r.id === roomId);
      if (idx === -1) return;
      rooms[idx].members = rooms[idx].members.filter(m => m !== userId);
      rooms[idx].memberCount = rooms[idx].members.length;
      if (rooms[idx].members.length === 0) { rooms.splice(idx, 1); }
      set(KEYS.PROTECTED_ROOMS, rooms);
    },

    sendMessage(roomId, userId, text) {
      const room = this.getById(roomId);
      if (!room || !room.members.includes(userId)) return null;
      if (room.mutedUsers.includes(userId)) return null;

      const msgs = get(KEYS.PROTECTED_MESSAGES, {});
      if (!msgs[roomId]) msgs[roomId] = [];
      const session = Backend.auth.getSession();
      let senderName = session?.name || 'User';
      let senderId = userId;

      if (room.anonymousMode) {
        const memberIdx = room.members.indexOf(userId);
        senderName = this._ANON_ALIASES[memberIdx % this._ANON_ALIASES.length];
        senderId = 'anon-' + memberIdx;
      }

      const msg = {
        id: uid(),
        type: 'message',
        senderId,
        senderName,
        senderAvatar: room.anonymousMode ? null : session?.avatar,
        text,
        timestamp: Date.now(),
        reactions: {},
      };
      msgs[roomId].push(msg);
      set(KEYS.PROTECTED_MESSAGES, msgs);

      // Update streak
      const rooms = this.getAll();
      const rIdx = rooms.findIndex(r => r.id === roomId);
      if (rIdx !== -1) {
        rooms[rIdx].lastActivity = Date.now();
        const daysSinceCreation = Math.floor((Date.now() - rooms[rIdx].createdAt) / 86400000);
        rooms[rIdx].streak = Math.min(daysSinceCreation + 1, 999);
        set(KEYS.PROTECTED_ROOMS, rooms);
      }
      return msg;
    },

    getMessages(roomId) { return (get(KEYS.PROTECTED_MESSAGES, {}))[roomId] || []; },

    // Admin actions
    muteUser(roomId, adminId, targetId) {
      const rooms = this.getAll();
      const r = rooms.find(x => x.id === roomId);
      if (!r || !r.admins.includes(adminId)) return false;
      if (!r.mutedUsers.includes(targetId)) r.mutedUsers.push(targetId);
      set(KEYS.PROTECTED_ROOMS, rooms);
      return true;
    },
    unmuteUser(roomId, adminId, targetId) {
      const rooms = this.getAll();
      const r = rooms.find(x => x.id === roomId);
      if (!r || !r.admins.includes(adminId)) return false;
      r.mutedUsers = r.mutedUsers.filter(m => m !== targetId);
      set(KEYS.PROTECTED_ROOMS, rooms);
      return true;
    },
    banUser(roomId, adminId, targetId) {
      const rooms = this.getAll();
      const r = rooms.find(x => x.id === roomId);
      if (!r || !r.admins.includes(adminId) || r.creatorId === targetId) return false;
      r.bannedUsers.push(targetId);
      r.members = r.members.filter(m => m !== targetId);
      r.memberCount = r.members.length;
      set(KEYS.PROTECTED_ROOMS, rooms);
      return true;
    },
    deleteRoom(roomId, userId) {
      const rooms = this.getAll();
      const r = rooms.find(x => x.id === roomId);
      if (!r || r.creatorId !== userId) return false;
      set(KEYS.PROTECTED_ROOMS, rooms.filter(x => x.id !== roomId));
      const msgs = get(KEYS.PROTECTED_MESSAGES, {});
      delete msgs[roomId];
      set(KEYS.PROTECTED_MESSAGES, msgs);
      return true;
    },
    updateRoom(roomId, adminId, updates) {
      const rooms = this.getAll();
      const idx = rooms.findIndex(r => r.id === roomId);
      if (idx === -1) return null;
      if (!rooms[idx].admins.includes(adminId)) return null;
      const safe = ['name','description','mood','themeColor','maxMembers','anonymousMode','ghostJoinEnabled'];
      safe.forEach(k => { if (updates[k] !== undefined) rooms[idx][k] = updates[k]; });
      if (updates.password !== undefined) {
        rooms[idx].passwordHash = updates.password ? simpleHash(updates.password) : null;
        rooms[idx].isPasswordProtected = !!updates.password;
      }
      set(KEYS.PROTECTED_ROOMS, rooms);
      return rooms[idx];
    },
    searchRooms(query) {
      if (!query || !query.trim()) return [];
      const q = query.trim().toLowerCase();
      const all = this.getAll();
      return all.filter(r => {
        if (this._isExpired(r)) return false;
        // Match by exact room ID
        if (r.id.toLowerCase() === q) return true;
        // Match by partial room name (case-insensitive)
        if (r.name.toLowerCase().includes(q)) return true;
        return false;
      });
    },

    addReaction(roomId, msgId, userId, emoji) {
      const msgs = get(KEYS.PROTECTED_MESSAGES, {});
      const roomMsgs = msgs[roomId] || [];
      const msg = roomMsgs.find(m => m.id === msgId);
      if (!msg) return;
      if (!msg.reactions) msg.reactions = {};
      if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
      if (msg.reactions[emoji].includes(userId)) {
        msg.reactions[emoji] = msg.reactions[emoji].filter(u => u !== userId);
        if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
      } else {
        msg.reactions[emoji].push(userId);
      }
      set(KEYS.PROTECTED_MESSAGES, msgs);
    },
  },

  // ── MUSIC ──
  music: {
    get() { return get(KEYS.MUSIC, SEED_MUSIC); },
    togglePlay() { const m = this.get(); m.nowPlaying.isPlaying = !m.nowPlaying.isPlaying; set(KEYS.MUSIC, m); return m; },
    skip() { const m = this.get(); if (m.queue.length) { const n = m.queue.shift(); Object.assign(m.nowPlaying, { title:n.title, artist:n.artist, progress:0 }); set(KEYS.MUSIC, m); } return m; },
    joinSession() { const m = this.get(); m.nowPlaying.listeners++; set(KEYS.MUSIC, m); return m; },
    addToQueue(t) { const m = this.get(); m.queue.push({ id:uid(), ...t }); set(KEYS.MUSIC, m); return m; },
  },

  // ── NOTIFICATIONS ──
  notifs: {
    getAll() { return get(KEYS.NOTIFICATIONS, SEED_NOTIFS); },
    markAllRead() { const n = this.getAll().map(x => ({...x, read:true})); set(KEYS.NOTIFICATIONS, n); return n; },
    markRead(id) { const n = this.getAll(); const i = n.findIndex(x => x.id === id); if (i !== -1) n[i].read = true; set(KEYS.NOTIFICATIONS, n); return n; },
    unreadCount() { return this.getAll().filter(n => !n.read).length; },
    add(notif) { const n = this.getAll(); n.unshift({ id:uid(), time:Date.now(), read:false, ...notif }); set(KEYS.NOTIFICATIONS, n); },
  },

  // ── AI INSIGHTS ──
  insights: {
    generate() {
      const chats = Backend.chats.getAll();
      return {
        archetype:'The Therapist Friend', archetypeDesc:'You listen more than you speak, often being the emotional anchor.',
        matchPercentage:94, textingStyle:'Chaotic Texter', textingAccuracy:82,
        peakTime:'11:42 PM', peakLabel:'The Night Owl Surge', socialEnergy:'A+',
        socialEnergyDesc:"Your aura is 'Radiant' based on the last 24h.",
        topContact: chats[0]?.name.split(' ')[0] || 'Elena',
        totalMessages: Object.values(get(KEYS.MESSAGES, {})).flat().length,
        weeklyActivity: [4,6,10,12,8,3],
      };
    },
  },

  // ── SETTINGS ──
  settings: {
    DEFAULT: {
      darkMode:false, lateNight:false, pushNotifs:true, msgNotifs:true,
      callNotifs:true, streakReminders:true, roomAlerts:true, musicPresence:true,
      aiInsights:true, ghostMode:false, hideOnline:false, invisStory:false,
      privateAccount:false, disappearing:false, autoDownload:true, twoFactor:false,
      auraVisible:true, memoryPrivate:false, streakVisible:true, badgeVisible:true,
      textSize:'default', accentColor:'red', theme:'light',
    },
    getAll() { return { ...this.DEFAULT, ...get(KEYS.SETTINGS, {}) }; },
    update(key, value) { const s = this.getAll(); s[key] = value; set(KEYS.SETTINGS, s); return s; },
    toggle(key) { const s = this.getAll(); s[key] = !s[key]; set(KEYS.SETTINGS, s); return s; },
    reset() { set(KEYS.SETTINGS, this.DEFAULT); return this.DEFAULT; },
  },

  // ── SECURITY ──
  security: {
    changePassword(uid2, currentPw, newPw) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const users = get(KEYS.USERS, []);
          const user = users.find(u => u.uid === uid2);
          if (!user) return reject(new Error('User not found'));
          if (user.passwordHash !== simpleHash(currentPw)) return reject(new Error('Current password is incorrect'));
          const pwErr = V.password(newPw);
          if (pwErr) return reject(new Error(pwErr));
          user.passwordHash = simpleHash(newPw);
          set(KEYS.USERS, users);
          resolve(true);
        }, 800);
      });
    },
    changeEmail(uid2, password, newEmail) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const users = get(KEYS.USERS, []);
          const user = users.find(u => u.uid === uid2);
          if (!user) return reject(new Error('User not found'));
          if (user.passwordHash !== simpleHash(password)) return reject(new Error('Incorrect password'));
          if (users.find(u => u.email === newEmail.toLowerCase() && u.uid !== uid2)) return reject(new Error('Email already in use'));
          user.email = newEmail.toLowerCase();
          set(KEYS.USERS, users);
          resolve(user);
        }, 800);
      });
    },
    deleteAccount(uid2, password) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const users = get(KEYS.USERS, []);
          const user = users.find(u => u.uid === uid2);
          if (!user) return reject(new Error('User not found'));
          if (user.passwordHash !== simpleHash(password)) return reject(new Error('Incorrect password'));
          set(KEYS.USERS, users.filter(u => u.uid !== uid2));
          localStorage.removeItem(KEYS.SESSION);
          resolve(true);
        }, 800);
      });
    },
    getLoginActivity() {
      const activity = get(KEYS.LOGIN_ACTIVITY, []);
      if (!activity.length) {
        const seed = [
          { id:'la1', device:'This Device', browser:'Chrome', ip:'192.168.1.x', time:Date.now(), current:true },
        ];
        set(KEYS.LOGIN_ACTIVITY, seed);
        return seed;
      }
      return activity;
    },
    logLogin() {
      const a = this.getLoginActivity();
      a.unshift({ id:uid(), device:'This Device', browser:navigator.userAgent.includes('Chrome')?'Chrome':'Browser', ip:'192.168.1.x', time:Date.now(), current:true });
      if (a.length > 10) a.length = 10;
      set(KEYS.LOGIN_ACTIVITY, a);
    },
  },

  // ── BLOCKED / MUTED ──
  blocked: {
    getAll() { return get(KEYS.BLOCKED, []); },
    add(userId, name) { const b = this.getAll(); b.push({ id:userId, name, blockedAt:Date.now() }); set(KEYS.BLOCKED, b); },
    remove(userId) { set(KEYS.BLOCKED, this.getAll().filter(b => b.id !== userId)); },
    count() { return this.getAll().length; },
  },
  muted: {
    getAll() { return get(KEYS.MUTED, []); },
    add(userId, name) { const m = this.getAll(); m.push({ id:userId, name, mutedAt:Date.now() }); set(KEYS.MUTED, m); },
    remove(userId) { set(KEYS.MUTED, this.getAll().filter(m => m.id !== userId)); },
    count() { return this.getAll().length; },
  },

  // ── DATA & STORAGE ──
  data: {
    getStorageUsed() {
      let total = 0;
      for (const key in localStorage) { if (key.startsWith('miscom_')) total += (localStorage.getItem(key) || '').length * 2; }
      return total;
    },
    formatSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1048576) return (bytes/1024).toFixed(1) + ' KB';
      return (bytes/1048576).toFixed(1) + ' MB';
    },
    clearCache() {
      const keep = [KEYS.USERS, KEYS.SESSION, KEYS.SETTINGS];
      Object.values(KEYS).forEach(k => { if (!keep.includes(k)) localStorage.removeItem(k); });
      Backend.init();
    },
  },

  // ── SOCIAL (Friend Requests) ──
  social: {
    searchUsers(query, currentUserId) {
      if (!query || query.length < 2) return [];
      const users = get(KEYS.USERS, []);
      const currentUser = users.find(u => u.uid === currentUserId);
      const currentUsername = currentUser ? currentUser.username : '';
      
      const q = query.toLowerCase();
      const results = users
        .filter(u => ((u.username || '').toLowerCase().includes(q) ||
                      (u.displayName || '').toLowerCase().includes(q) ||
                      (u.name || '').toLowerCase().includes(q)))
        .map(u => ({ 
          uid: u.uid, 
          username: u.username, 
          displayName: u.displayName || u.name || u.username,
          name: u.name, 
          avatar: u.avatar, 
          aura: u.aura, 
          bio: u.bio 
        }));

      // Deduplicate by username. If there are duplicates, prefer the one that matches the current user.
      const uniqueResults = [];
      const seen = new Set();
      
      // Sort results so the current user appears first for their own username
      results.sort((a, b) => {
        if (a.uid === currentUserId) return -1;
        if (b.uid === currentUserId) return 1;
        return 0;
      });

      for (const r of results) {
        if (!seen.has(r.username)) {
          // If this is a duplicate account from a different uid but same username as current user, hide it!
          if (r.username === currentUsername && r.uid !== currentUserId) continue;
          
          seen.add(r.username);
          uniqueResults.push(r);
        }
      }
      return uniqueResults.slice(0, 20);
    },

    sendRequest(fromId, toId) {
      if (fromId === toId) return { success: false, error: "Can't add yourself" };
      const friends = get(KEYS.FRIENDS, {});
      const myFriends = friends[fromId] || [];
      if (myFriends.includes(toId)) return { success: false, error: 'Already connected' };

      const requests = get(KEYS.FRIEND_REQUESTS, []);
      const existing = requests.find(r => r.from === fromId && r.to === toId && r.status === 'pending');
      if (existing) return { success: false, error: 'Request already sent' };
      
      // Check reverse
      const reverse = requests.find(r => r.from === toId && r.to === fromId && r.status === 'pending');
      if (reverse) return this.acceptRequest(fromId, reverse.id);

      const fromUser = get(KEYS.USERS, []).find(u => u.uid === fromId);
      const req = { 
        id: 'fr-' + Date.now() + Math.random().toString(36).slice(2,6), 
        from: fromId, 
        to: toId, 
        status: 'pending', 
        createdAt: Date.now(),
        fromUser: fromUser ? {
          uid: fromUser.uid,
          username: fromUser.username,
          displayName: fromUser.displayName || fromUser.name,
          avatar: fromUser.avatar,
          aura: fromUser.aura
        } : null
      };
      requests.push(req);
      set(KEYS.FRIEND_REQUESTS, requests);

      if (FirebaseSync.isReady()) FirebaseSync.sendVibeRequest(req);

      Backend.notifs.add({ type: 'social', title: fromUser?.displayName || fromUser?.name || 'Someone', body: 'sent you a Vibe Request ✨', icon: 'person_add', targetUserId: toId });
      return { success: true };
    },

    getIncomingRequests(userId) {
      const requests = get(KEYS.FRIEND_REQUESTS, []);
      const users = get(KEYS.USERS, []);
      return requests
        .filter(r => r.to === userId && r.status === 'pending')
        .map(r => {
          const u = users.find(x => x.uid === r.from);
          return { ...r, fromUser: u ? { uid: u.uid, username: u.username, name: u.name, avatar: u.avatar, aura: u.aura } : null };
        });
    },

    getOutgoingRequests(userId) {
      const requests = get(KEYS.FRIEND_REQUESTS, []);
      return requests.filter(r => r.from === userId && r.status === 'pending');
    },

    acceptRequest(userId, requestId) {
      const requests = get(KEYS.FRIEND_REQUESTS, []);
      const idx = requests.findIndex(r => r.id === requestId && r.to === userId && r.status === 'pending');
      if (idx === -1) return { success: false, error: 'Request not found' };
      const req = requests[idx];
      requests[idx].status = 'accepted';
      set(KEYS.FRIEND_REQUESTS, requests);

      // Add to friends list (bidirectional)
      const friends = get(KEYS.FRIENDS, {});
      if (!friends[userId]) friends[userId] = [];
      if (!friends[req.from]) friends[req.from] = [];
      if (!friends[userId].includes(req.from)) friends[userId].push(req.from);
      if (!friends[req.from].includes(userId)) friends[req.from].push(userId);
      set(KEYS.FRIENDS, friends);

      if (FirebaseSync.isReady()) {
        FirebaseSync.updateVibeRequest(requestId, 'accepted');
        FirebaseSync.updateFriendsList(userId, friends[userId]);
        FirebaseSync.updateFriendsList(req.from, friends[req.from]);
      }

      // Auto-create a chat
      const users = get(KEYS.USERS, []);
      const friendUser = users.find(u => u.uid === req.from);
      const chats = get(KEYS.CHATS, []);
      const chatId = 'chat-' + [userId, req.from].sort().join('-');
      if (!chats.find(c => c.id === chatId)) {
        chats.unshift({
          id: chatId,
          contactId: req.from,
          name: friendUser?.name || friendUser?.username || 'Friend',
          avatar: friendUser?.avatar || null,
          lastMessage: 'You are now connected! 🎉',
          lastTimestamp: Date.now(),
          chatType: 'direct',
          requestStatus: 'accepted',
          participants: [userId, req.from],
          unread: 1,
          online: false,
          typing: false,
          isGroup: false,
        });
        set(KEYS.CHATS, chats);
        const msgs = get(KEYS.MESSAGES, {});
        msgs[chatId] = [{ id: 'sys-' + Date.now(), sender: 'system', text: 'You are now connected! Start chatting 🎉', timestamp: Date.now(), type: 'text' }];
        set(KEYS.MESSAGES, msgs);
      }

      // Notification
      Backend.notifs.add({ type: 'social', title: friendUser?.name || 'Someone', body: 'accepted your friend request!', icon: 'person', targetUserId: req.from });
      return { success: true, chatId };
    },

    declineRequest(userId, requestId) {
      const requests = get(KEYS.FRIEND_REQUESTS, []);
      const idx = requests.findIndex(r => r.id === requestId && r.to === userId && r.status === 'pending');
      if (idx === -1) return { success: false };
      requests[idx].status = 'declined';
      set(KEYS.FRIEND_REQUESTS, requests);
      
      if (FirebaseSync.isReady()) {
        FirebaseSync.updateVibeRequest(requestId, 'declined');
      }
      return { success: true };
    },

    cancelRequest(userId, requestId) {
      const requests = get(KEYS.FRIEND_REQUESTS, []);
      const idx = requests.findIndex(r => r.id === requestId && r.from === userId && r.status === 'pending');
      if (idx === -1) return { success: false };
      requests.splice(idx, 1);
      set(KEYS.FRIEND_REQUESTS, requests);

      if (FirebaseSync.isReady()) {
        FirebaseSync.deleteVibeRequest(requestId);
      }
      return { success: true };
    },

    getFriends(userId) {
      const friends = get(KEYS.FRIENDS, {});
      const friendIds = friends[userId] || [];
      const users = get(KEYS.USERS, []);
      return friendIds.map(fid => {
        const u = users.find(x => x.uid === fid);
        return u ? { 
          uid: u.uid, 
          username: u.username, 
          displayName: u.displayName || u.name || u.username,
          name: u.name, 
          avatar: u.avatar, 
          aura: u.aura, 
          bio: u.bio 
        } : null;
      }).filter(Boolean);
    },

    unfriend(userId, friendId) {
      const friends = get(KEYS.FRIENDS, {});
      if (friends[userId]) friends[userId] = friends[userId].filter(f => f !== friendId);
      if (friends[friendId]) friends[friendId] = friends[friendId].filter(f => f !== userId);
      set(KEYS.FRIENDS, friends);

      if (FirebaseSync.isReady()) {
        FirebaseSync.updateFriendsList(userId, friends[userId] || []);
        FirebaseSync.updateFriendsList(friendId, friends[friendId] || []);
      }
      return { success: true };
    },

    getRequestStatus(fromId, toId) {
      const friends = get(KEYS.FRIENDS, {});
      if ((friends[fromId] || []).includes(toId)) return 'friends';
      const requests = get(KEYS.FRIEND_REQUESTS, []);
      const sent = requests.find(r => r.from === fromId && r.to === toId && r.status === 'pending');
      if (sent) return 'sent';
      const received = requests.find(r => r.from === toId && r.to === fromId && r.status === 'pending');
      if (received) return 'received';
      return 'none';
    },

    // ─── MESSAGE REQUESTS ──────────────────────────────────────────────────
    async sendMessageRequest(fromId, toId, firstMessage) {
      if (fromId === toId) return { success: false, error: "Can't message yourself" };
      const req = {
        id: 'mr-' + Date.now(),
        senderId: fromId,
        receiverId: toId,
        message: firstMessage,
        status: 'pending',
        createdAt: Date.now()
      };
      if (FirebaseSync.isReady()) await FirebaseSync.sendMessageRequest(req);
      return { success: true };
    },

    async acceptMessageRequest(userId, requestId) {
      if (FirebaseSync.isReady()) await FirebaseSync.updateMessageRequest(requestId, 'accepted');
      return { success: true };
    },

    async rejectMessageRequest(userId, requestId) {
      if (FirebaseSync.isReady()) await FirebaseSync.updateMessageRequest(requestId, 'rejected');
      return { success: true };
    },

    // ─── BLOCKING ─────────────────────────────────────────────────────────
    async blockUser(userId, blockId) {
      if (FirebaseSync.isReady()) await FirebaseSync.blockUser(userId, blockId);
      return { success: true };
    },

    async unblockUser(userId, blockId) {
      if (FirebaseSync.isReady()) await FirebaseSync.unblockUser(userId, blockId);
      return { success: true };
    }
  },

  timeAgo, V,
  resetAll() { Object.values(KEYS).forEach(k => localStorage.removeItem(k)); this.init(); },
};

Backend.init();
export default Backend;
export { AVATARS, timeAgo };
