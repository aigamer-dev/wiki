import "dotenv/config";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function wipeEntries() {
    console.log("Fetching existing entries to wipe...");
    const snap = await getDocs(collection(db, "entries"));
    let count = 0;
    for (const d of snap.docs) {
        await deleteDoc(doc(db, "entries", d.id));
        count++;
    }
    console.log(`Deleted ${count} documents from 'entries' collection.`);
    process.exit(0);
}

wipeEntries();
