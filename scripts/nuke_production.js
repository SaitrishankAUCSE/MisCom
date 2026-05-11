import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// This script will wipe ALL data from the 'miscom-app' project.
// Usage: node scripts/nuke_production.js

console.log('☢️ WARNING: This will delete ALL users and data from miscom-app.');
console.log('☢️ Starting in 3 seconds...');

// Starting execution
(async () => {
  try {
    // We try to initialize with application default credentials
    admin.initializeApp({
      projectId: 'miscom-app'
    });

    const db = admin.firestore();
    const auth = admin.auth();

    // 1. Wipe Auth
    console.log('🧹 Wiping Auth Users...');
    const listUsers = async (nextPageToken) => {
      const result = await auth.listUsers(1000, nextPageToken);
      const uids = result.users.map(u => u.uid);
      if (uids.length > 0) {
        await auth.deleteUsers(uids);
        console.log(`✅ Deleted ${uids.length} users.`);
      }
      if (result.pageToken) await listUsers(result.pageToken);
    };
    await listUsers();

    // 2. Wipe Firestore
    console.log('🧹 Wiping Firestore Collections...');
    const collections = await db.listCollections();
    for (const col of collections) {
      console.log(`🗑️ Deleting ${col.id}...`);
      await deleteCollection(db, col);
    }

    console.log('✨ Mission accomplished. MisCom is now a ghost town.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\n💡 TIP: If you get a permission error, run:');
    console.log('   gcloud auth application-default login');
    process.exit(1);
  }
})();

async function deleteCollection(db, collection) {
  const query = collection.limit(500);
  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve, reject);
  });
}

async function deleteQueryBatch(db, query, resolve, reject) {
  const snapshot = await query.get();
  if (snapshot.size === 0) {
    resolve();
    return;
  }
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  process.nextTick(() => deleteQueryBatch(db, query, resolve, reject));
}
