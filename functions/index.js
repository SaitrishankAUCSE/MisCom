const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
const storage = admin.storage();
const auth = admin.auth();

/**
 * Irreversible Account Deletion Function
 * Triggers a massive cleanup of all user-related data across all Firebase services.
 */
exports.deleteUserAccount = functions.https.onCall(async (data, context) => {
  // 1. Authentication Check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const uid = context.auth.uid;
  console.log(`[Account Deletion] Starting wipe for user: ${uid}`);

  try {
    // 2. Storage Cleanup (Recursive delete of user-owned buckets)
    const bucket = storage.bucket();
    const storagePaths = [
      `users/${uid}`,
      `stories/${uid}`,
      `chat_media/${uid}`,
      `room_media/${uid}`,
      `voice_notes/${uid}`,
      `uploads/${uid}`,
      `cache/${uid}`
    ];

    for (const path of storagePaths) {
      try {
        await bucket.deleteFiles({ prefix: path });
        console.log(`[Account Deletion] Deleted storage files at: ${path}`);
      } catch (err) {
        console.warn(`[Account Deletion] Storage cleanup warning at ${path}:`, err.message);
      }
    }

    // 3. Firestore Recursive Cleanup (Batch limited to 500 ops)
    // For a real production app with massive data, this should be done in multiple batches or a dedicated queue.
    const batch = db.batch();

    // -- Helper to delete docs from a query --
    const deleteQueryBatch = async (query) => {
      const snapshot = await query.get();
      snapshot.forEach(doc => batch.delete(doc.ref));
    };

    // -- Primary Identity --
    batch.delete(db.collection('users').doc(uid));
    batch.delete(db.collection('friends').doc(uid)); // friends mapping
    batch.delete(db.collection('online_status').doc(uid));
    batch.delete(db.collection('typing_status').doc(uid));
    batch.delete(db.collection('streaks').doc(uid));
    batch.delete(db.collection('insights').doc(uid));
    batch.delete(db.collection('social_energy').doc(uid));

    // -- Social Relationships (Sent/Received) --
    await deleteQueryBatch(db.collection('friend_requests').where('from', '==', uid));
    await deleteQueryBatch(db.collection('friend_requests').where('to', '==', uid));
    await deleteQueryBatch(db.collection('vibe_requests').where('from', '==', uid));
    await deleteQueryBatch(db.collection('vibe_requests').where('to', '==', uid));
    await deleteQueryBatch(db.collection('blocked_users').where('blockerId', '==', uid));
    await deleteQueryBatch(db.collection('blocked_users').where('blockedId', '==', uid));
    await deleteQueryBatch(db.collection('user_connections').where('participants', 'array-contains', uid));

    // -- Notifications --
    await deleteQueryBatch(db.collection('notifications').where('from', '==', uid));
    await deleteQueryBatch(db.collection('notifications').where('to', '==', uid));

    // -- Chats & Messages (DMs & Groups) --
    const chats = await db.collection('chat_meta').where('participants', 'array-contains', uid).get();
    
    for (const chatDoc of chats.docs) {
      const chatId = chatDoc.id;
      const chatData = chatDoc.data();

      if (chatData.isGroup) {
        // Remove user from group participants instead of deleting entire group
        batch.update(chatDoc.ref, {
          participants: admin.firestore.FieldValue.arrayRemove(uid),
          memberCount: admin.firestore.FieldValue.increment(-1)
        });
      } else {
        // For DMs, we delete the entire thread as per "disappear entirely" rule
        batch.delete(chatDoc.ref);
        
        // Cleanup all messages in subcollection
        const messages = await db.collection('chats').doc(chatId).collection('messages').get();
        messages.forEach(mDoc => batch.delete(mDoc.ref));
        batch.delete(db.collection('chats').doc(chatId));
      }
    }

    // -- Stories --
    const stories = await db.collection('stories').where('userId', '==', uid).get();
    for (const sDoc of stories.docs) {
      batch.delete(sDoc.ref);
      // Delete story views sub-activity
      await deleteQueryBatch(db.collection('story_views').where('storyId', '==', sDoc.id));
      await deleteQueryBatch(db.collection('reactions').where('targetId', '==', sDoc.id));
    }

    // -- Rooms (Owner vs Member) --
    const ownedRooms = await db.collection('rooms').where('ownerId', '==', uid).get();
    for (const roomDoc of ownedRooms.docs) {
      const roomId = roomDoc.id;
      batch.delete(roomDoc.ref);
      
      // Cleanup room content
      await deleteQueryBatch(db.collection('room_messages').where('roomId', '==', roomId));
      await deleteQueryBatch(db.collection('room_members').where('roomId', '==', roomId));
      await deleteQueryBatch(db.collection('room_invites').where('roomId', '==', roomId));
    }

    // Removal from joined rooms
    await deleteQueryBatch(db.collection('room_members').where('userId', '==', uid));

    // -- Miscellaneous Activity --
    await deleteQueryBatch(db.collection('reactions').where('userId', '==', uid));
    await deleteQueryBatch(db.collection('read_receipts').where('userId', '==', uid));
    await deleteQueryBatch(db.collection('reports').where('reporterId', '==', uid));
    await deleteQueryBatch(db.collection('reports').where('reportedId', '==', uid));
    await deleteQueryBatch(db.collection('shared_spaces').where('participants', 'array-contains', uid));

    // -- Final Commit of Batch --
    await batch.commit();
    console.log(`[Account Deletion] Firestore wipe completed for user: ${uid}`);

    // 4. Firebase Authentication Deletion (The Nuclear Step)
    await auth.deleteUser(uid);
    console.log(`[Account Deletion] Auth user permanently removed: ${uid}`);

    return { success: true, message: 'Your identity and all related data have been permanently wiped from MisCom.' };

  } catch (error) {
    console.error(`[Account Deletion] CRITICAL ERROR for user ${uid}:`, error);
    throw new functions.https.HttpsError('internal', `Irreversible wipe failed: ${error.message}`);
  }
});
