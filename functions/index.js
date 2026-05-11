const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const functions = require('firebase-functions');
const { initializeApp }     = require('firebase-admin/app');
const { getFirestore, FieldValue }      = require('firebase-admin/firestore');
const { getMessaging }      = require('firebase-admin/messaging');
const admin = require('firebase-admin');

// Initialize admin once
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = getFirestore();
const auth = admin.auth();
const storage = admin.storage();

// ─── DM message notification ────────────────────────────────────────────────
exports.onNewDMMessage = onDocumentCreated(
  'chats/{chatId}/messages/{messageId}',
  async (event) => {
    const message    = event.data.data();
    const { chatId } = event.params;

    // 1. Get the chat_meta to find participants
    const chatMetaSnap = await db.doc(`chat_meta/${chatId}`).get();
    if (!chatMetaSnap.exists) return;
    const { participants } = chatMetaSnap.data();

    // 2. Recipient = the participant who is NOT the sender
    const recipientId = participants.find(uid => uid !== message.senderId);
    if (!recipientId) return;

    // 3. Don't notify if recipient is currently in this chat (activeChat field)
    const recipientSnap = await db.doc(`users/${recipientId}`).get();
    if (!recipientSnap.exists) return;
    const recipient = recipientSnap.data();

    if (recipient.activeChat === chatId) return; // they're already looking at it

    // 4. Get sender display name
    const senderSnap = await db.doc(`users/${message.senderId}`).get();
    const sender     = senderSnap.exists ? senderSnap.data() : null;
    const senderName = sender?.displayName || sender?.username || 'Someone';

    // 5. Build notification body
    let body = message.text || '';
    if (message.type === 'image') body = '📷 Photo';
    if (message.type === 'video') body = '🎥 Video';
    if (message.type === 'audio') body = '🎤 Voice message';
    if (!body) body = 'New message';

    // 6. Write to Firestore notification feed (powers in-app bell)
    await db.collection(`notifications/${recipientId}/user_notifs`).add({
      type:      'dm',
      chatId,
      senderId:  message.senderId,
      senderName,
      senderPhoto: sender?.avatar || sender?.photoURL || null,
      body,
      read:      false,
      createdAt: FieldValue.serverTimestamp(),
    });

    // 6.5 Increment unread count in chat_meta
    await db.doc(`chat_meta/${chatId}`).set({
      unreadCounts: {
        [recipientId]: FieldValue.increment(1)
      },
      lastMessage: body,
      lastMessageTime: FieldValue.serverTimestamp(),
      lastSenderId: message.senderId
    }, { merge: true });

    // 7. Send FCM push if recipient has a token
    const fcmToken = recipient.fcmToken;
    if (!fcmToken) return;

    try {
      await getMessaging().send({
        token: fcmToken,
        notification: {
          title: senderName,
          body,
        },
        data: {
          type:   'dm',
          chatId,
          senderId: message.senderId,
        },
      });
    } catch (err) {
      console.warn('FCM send failed:', err.message);
    }
  }
);

// ─── Room / channel message notification ────────────────────────────────────
exports.onNewRoomMessage = onDocumentCreated(
  'rooms/{roomId}/room_messages/{messageId}',
  async (event) => {
    const message     = event.data.data();
    const { roomId }  = event.params;

    const roomSnap = await db.doc(`rooms/${roomId}`).get();
    if (!roomSnap.exists) return;
    const room = roomSnap.data();

    const senderSnap = await db.doc(`users/${message.senderId}`).get();
    const sender     = senderSnap.exists ? senderSnap.data() : null;
    const senderName = sender?.displayName || sender?.username || 'Someone';

    let body = message.text || '';
    if (message.type === 'image') body = '📷 Photo';
    if (!body) body = 'New message';

    const members = room.participants || room.members || [];
    const targets = members.filter(uid => uid !== message.senderId);

    const messaging = getMessaging();

    await Promise.all(targets.map(async (uid) => {
      await db.collection(`notifications/${uid}/user_notifs`).add({
        type:        'room',
        roomId,
        roomName:    room.name || 'Room',
        senderId:    message.senderId,
        senderName,
        body,
        read:        false,
        createdAt:   FieldValue.serverTimestamp(),
      });

      // Increment unread count in room meta
      await db.doc(`rooms/${roomId}`).set({
        unreadCounts: {
          [uid]: FieldValue.increment(1)
        }
      }, { merge: true });

      const userSnap = await db.doc(`users/${uid}`).get();
      if (!userSnap.exists) return;
      const userData = userSnap.data();
      if (userData.activeChat === roomId) return; 

      const fcmToken = userData.fcmToken;
      if (!fcmToken) return;

      try {
        await messaging.send({
          token: fcmToken,
          notification: {
            title: `${room.name || 'Room'} • ${senderName}`,
            body,
          },
          data: { type: 'room', roomId },
        });
      } catch (err) {
        console.warn(`FCM send failed for user ${uid}:`, err.message);
      }
    }));
  }
);

// ─── Irreversible Account Deletion (Keep existing) ───────────────────────
exports.deleteUserAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const uid = context.auth.uid;
  console.log(`[Account Deletion] Starting wipe for user: ${uid}`);

  try {
    const bucket = storage.bucket();
    const storagePaths = [`users/${uid}`, `stories/${uid}`, `chat_media/${uid}`, `room_media/${uid}`, `voice_notes/${uid}`, `uploads/${uid}`];

    for (const path of storagePaths) {
      try { await bucket.deleteFiles({ prefix: path }); } catch (err) {}
    }

    const batch = db.batch();
    const deleteQueryBatch = async (query) => {
      const snapshot = await query.get();
      snapshot.forEach(doc => batch.delete(doc.ref));
    };

    batch.delete(db.collection('users').doc(uid));
    batch.delete(db.collection('friends').doc(uid));
    batch.delete(db.collection('online_status').doc(uid));
    batch.delete(db.collection('typing_status').doc(uid));
    batch.delete(db.collection('notifications').doc(uid)); // Top level delete

    await deleteQueryBatch(db.collection(`notifications/${uid}/user_notifs`));
    await deleteQueryBatch(db.collection('friend_requests').where('from', '==', uid));
    await deleteQueryBatch(db.collection('friend_requests').where('to', '==', uid));
    await deleteQueryBatch(db.collection('chat_meta').where('participants', 'array-contains', uid));

    await batch.commit();
    await auth.deleteUser(uid);

    return { success: true, message: 'Account wiped.' };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});
