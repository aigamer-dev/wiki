import "dotenv/config";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
    const querySnapshot = await getDocs(collection(db, "entries"));
    console.log(`Found ${querySnapshot.size} entries.`);
    querySnapshot.forEach((doc) => {
        console.log(doc.id, " => ", doc.data());
    });
    process.exit(0);
}
check();
