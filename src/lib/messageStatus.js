import {
  doc, updateDoc, serverTimestamp,
  writeBatch, collection, query,
  where, getDocs
} from 'firebase/firestore';
import { db } from './firebase';

// Status constants — single source of truth for MisCom / Echo Identity
export const STATUS = {
  SENDING:  'sending',   // optimistic — not yet written to Firestore
  ECHOED:   'echoed',    // written to Firestore (Sent)
  REACHED:  'reached',   // recipient device received it (Delivered)
  FELT:     'felt',      // recipient actually opened and read the message (Seen)
};

// Call when recipient opens the chat — marks all unread messages as FELT
export async function markThreadFelt(chatId, recipientId) {
  const messagesRef = collection(db, `chats/${chatId}/messages`);
  const q = query(
    messagesRef,
    where('status', 'in', [STATUS.ECHOED, STATUS.REACHED]),
    where('senderId', '!=', recipientId)   // only messages sent TO them
  );
  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach(d => {
    batch.update(d.ref, {
      status: STATUS.FELT,
      feltAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

// Call when recipient's device loads the chat — moves ECHOED → REACHED
export async function markThreadReached(chatId, recipientId) {
  const messagesRef = collection(db, `chats/${chatId}/messages`);
  const q = query(
    messagesRef,
    where('status', '==', STATUS.ECHOED),
    where('senderId', '!=', recipientId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach(d => {
    batch.update(d.ref, {
      status:     STATUS.REACHED,
      reachedAt:  serverTimestamp(),
    });
  });
  await batch.commit();
}

// Dissolve (unsend) a message
export async function dissolveMessage(chatId, messageId) {
  await updateDoc(doc(db, `chats/${chatId}/messages`, messageId), {
    dissolved:   true,
    dissolvedAt: serverTimestamp(),
    text:        null,
    type:        'dissolved',
  });
}
