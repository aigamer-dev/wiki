import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
    projectId: "aigamer-encyclopedia-v3",
    appId: "1:363809660823:web:56c9cde0bc71196b646ed2",
    storageBucket: "aigamer-encyclopedia-v3.firebasestorage.app",
    apiKey: "AIzaSyB3M4C4_6jQfwu7cepg6lYVsjC6FnbaORc",
    authDomain: "aigamer-encyclopedia-v3.firebaseapp.com",
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
