import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
    projectId: "aigamer-encyclopedia-v3",
    appId: "1:363809660823:web:56c9cde0bc71196b646ed2",
    storageBucket: "aigamer-encyclopedia-v3.firebasestorage.app",
    apiKey: "AIzaSyB3M4C4_6jQfwu7cepg6lYVsjC6FnbaORc",
    authDomain: "aigamer-encyclopedia-v3.firebaseapp.com",
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
