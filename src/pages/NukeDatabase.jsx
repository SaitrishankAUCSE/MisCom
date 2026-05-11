import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Backend from '../lib/backend';
import FirebaseSync, { db } from '../lib/firebase';
import { useGlobal } from '../context/GlobalContext';
import { collection, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';

export default function NukeDatabase() {
  const navigate = useNavigate();
  const { logout } = useGlobal();
  const [status, setStatus] = useState('Nuking local database...');

  useEffect(() => {
    const wipe = async () => {
      // 1. Clear all Local Storage items starting with 'miscom_'
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('miscom_')) {
          localStorage.removeItem(key);
        }
      }

      // 2. Clear Firestore Data (Deep Wipe)
      if (FirebaseSync.isReady() && user?.uid) {
        setStatus('Initiating deep cloud wipe...');
        const rootCollections = ['users', 'chats', 'chat_meta', 'notifications', 'friend_requests', 'friends', 'rooms', 'memories'];
        
        for (const colName of rootCollections) {
          try {
            const snap = await getDocs(collection(db, colName));
            console.log(`🔍 Checking ${colName} (${snap.size} docs)...`);
            
            for (const docSnap of snap.docs) {
              // Handle known sub-collections
              const subCollections = colName === 'chats' ? ['messages'] : (colName === 'rooms' ? ['messages', 'members'] : (colName === 'notifications' ? ['user_notifs'] : []));
              
              for (const subCol of subCollections) {
                const subSnap = await getDocs(collection(db, colName, docSnap.id, subCol));
                const subBatch = writeBatch(db);
                subSnap.docs.forEach(d => subBatch.delete(d.ref));
                await subBatch.commit();
              }
              
              // Delete the root document
              await deleteDoc(docSnap.ref);
            }
            console.log(`✅ Nuked collection: ${colName}`);
          } catch (e) {
            console.warn(`Could not nuke ${colName}:`, e.message);
          }
        }
      }

      // 4. Clear Firebase session
      if (FirebaseSync.isReady()) {
        await FirebaseSync.signOutUser().catch(() => {});
      }

      logout();
      setStatus('Success! The database has been wiped clean. App is now at zero users.');
    };
    wipe();
  }, [logout, user?.uid]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center font-body-md">
      <span className="material-symbols-outlined text-error text-6xl mb-6">warning</span>
      <h1 className="text-3xl font-display font-bold mb-4">Database Nuked</h1>
      <p className="text-gray-300 mb-8 max-w-md">
        {status}
      </p>

      <div className="bg-surface-container-highest p-6 rounded-2xl max-w-md text-left mb-8 border border-error/20">
        <h2 className="text-error font-bold mb-2">⚠️ Action Required</h2>
        <p className="text-sm text-gray-300 mb-4">
          To completely remove all users from production, you must also clear your Firebase Console:
        </p>
        <ol className="list-decimal pl-5 text-sm text-gray-300 space-y-2">
          <li>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-primary-container hover:underline">console.firebase.google.com</a></li>
          <li>Select your project (<strong>amerox-airdrop</strong>)</li>
          <li>Go to <strong>Authentication &gt; Users</strong></li>
          <li>Click the three dots at the top right and select <strong>Delete all users</strong> (or select them manually).</li>
          <li>Go to <strong>Firestore Database</strong> and delete the <code>users</code> collection.</li>
        </ol>
      </div>

      <button onClick={() => window.location.href = '/'} 
        className="bg-primary-container text-white px-8 py-3 rounded-full font-bold hover:bg-primary-fixed-dim transition-colors">
        Return to App
      </button>
    </div>
  );
}
