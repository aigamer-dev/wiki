import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../components/AuthContext';

export default function RandomRedirect() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    useEffect(() => {
        const fetchRandom = async () => {
            try {
                // 1. Get all available page titles
                const snapshot = await getDocs(collection(db, 'entries'));
                if (snapshot.empty) {
                    navigate('/');
                    return;
                }
                let allPages = [];
                snapshot.forEach((d) => allPages.push(d.id));

                // Exclude the very last page the user was looking at to prevent immediate looping
                const latestViewed = sessionStorage.getItem('latest_page_viewed');
                if (latestViewed && allPages.length > 1) {
                    allPages = allPages.filter(p => p !== latestViewed);
                }

                let chosenPage = null;

                // 2. Determine target pool
                if (currentUser) {
                    // Logged in: target unread pages, or least-read pages
                    const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
                    const userData = userSnap.exists() ? userSnap.data() : {};
                    const pagesRead = userData.pagesRead || [];
                    const readCounts = userData.readCounts || {};

                    const unreadPages = allPages.filter(p => !pagesRead.includes(p));

                    if (unreadPages.length > 0) {
                        // Pick random unread
                        chosenPage = unreadPages[Math.floor(Math.random() * unreadPages.length)];
                    } else {
                        // All pages read! Find the least-read page(s)
                        const counts = allPages.map(p => ({ title: p, count: readCounts[p] || 0 }));
                        // Find minimum count
                        const minCount = Math.min(...counts.map(c => c.count));
                        const leastReadPages = counts.filter(c => c.count === minCount).map(c => c.title);
                        // Pick random from the precise least-read pool
                        chosenPage = leastReadPages[Math.floor(Math.random() * leastReadPages.length)];
                    }
                } else {
                    // Anonymous user: generic session storage rotation
                    let seen = [];
                    try {
                        seen = JSON.parse(sessionStorage.getItem('random_seen_history') || '[]');
                    } catch (e) {
                        seen = [];
                    }

                    let unseenPages = allPages.filter(p => !seen.includes(p));
                    if (unseenPages.length === 0) {
                        seen = [];
                        unseenPages = allPages;
                    }

                    chosenPage = unseenPages[Math.floor(Math.random() * unseenPages.length)];

                    seen.push(chosenPage);
                    if (seen.length > 50) seen.shift();
                    sessionStorage.setItem('random_seen_history', JSON.stringify(seen));
                }

                // Navigate
                if (chosenPage) {
                    navigate(`/wiki/${encodeURIComponent(chosenPage)}`, { replace: true });
                } else {
                    navigate('/', { replace: true });
                }

            } catch (error) {
                console.error("Error picking random page:", error);
                navigate('/');
            }
        };

        fetchRandom();
    }, [navigate, currentUser]);

    return (
        <div className="flex justify-center items-center h-64 flex-col gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 font-medium">Finding the perfect page for you...</p>
        </div>
    );
}
