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

  const handleCloudNuke = async () => {
    const secret = prompt('Enter Secret Nuke Key:');
    if (secret === 'MISCOM_NUKE_2026') {
      setStatus('🚀 TRIGERRED GLOBAL NUKE... Please wait...');
      try {
        await FirebaseSync.globalNuke(secret);
        setStatus('✨ TOTAL PROJECT WIPE COMPLETE. Zero users exist globally.');
        setTimeout(() => logout(), 2000);
      } catch (err) {
        setStatus(`❌ Cloud Nuke Failed: ${err.message}`);
      }
    } else if (secret) {
      alert('Invalid secret key.');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center font-body-md">
      <span className="material-symbols-outlined text-error text-6xl mb-6 animate-pulse">warning</span>
      <h1 className="text-3xl font-display font-bold mb-4">Nuclear Reset Center</h1>
      <p className="text-gray-300 mb-8 max-w-md">
        {status}
      </p>

      <div className="flex flex-col gap-4 w-full max-w-md">
        <button onClick={handleCloudNuke} 
          className="bg-error text-white px-8 py-4 rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg flex items-center justify-center gap-2">
          <span className="material-symbols-outlined">delete_forever</span>
          Cloud Wipe (Auth + DB)
        </button>

        <button onClick={() => window.location.href = '/'} 
          className="bg-surface-container-highest text-on-surface px-8 py-4 rounded-2xl font-bold hover:bg-surface-variant transition-colors">
          Return to App
        </button>
      </div>

      <div className="mt-12 bg-surface-container-highest p-6 rounded-2xl max-w-md text-left border border-error/20">
        <h2 className="text-error font-bold mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">info</span>
          Admin Instructions
        </h2>
        <p className="text-sm text-gray-300 mb-4">
          The <strong>Cloud Wipe</strong> button uses a server-side Cloud Function to delete ALL Auth records and ALL Firestore data.
        </p>
        <p className="text-[10px] text-gray-500 uppercase font-bold">Secret Key: MISCOM_NUKE_2026</p>
      </div>
    </div>
  );
}
