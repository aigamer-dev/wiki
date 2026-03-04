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
                const allPages = [];
                snapshot.forEach((d) => allPages.push(d.id));

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
                        seen = JSON.parse(sessionStorage.getItem('random_seen') || '[]');
                    } catch (e) {
                        seen = [];
                    }

                    let unseenPages = allPages.filter(p => !seen.includes(p));
                    if (unseenPages.length === 0) {
                        // Exhausted the pool, reset
                        seen = [];
                        unseenPages = allPages;
                    }

                    chosenPage = unseenPages[Math.floor(Math.random() * unseenPages.length)];
                }

                // Global session history check to strictly prevent back-to-back repeats if possible
                if (chosenPage && allPages.length > 1) {
                    let seen = [];
                    try { seen = JSON.parse(sessionStorage.getItem('random_seen') || '[]'); } catch (e) { seen = []; }

                    // If the algorithm mathematically picked the exact same page we just arrived from, force a re-roll
                    // using the remaining valid pool (either unread, or other least-read, or just any other page)
                    if (seen.length > 0 && seen[seen.length - 1] === chosenPage) {
                        const fallbacks = allPages.filter(p => p !== chosenPage);
                        chosenPage = fallbacks[Math.floor(Math.random() * fallbacks.length)];
                    }

                    // For anonymous users we track the full sequence, for logged-in we really only need the last one
                    // to prevent immediate bounces, but tracking the limit helps. Let's cap history at 50 so it doesn't leak.
                    seen.push(chosenPage);
                    if (seen.length > 50) seen.shift();
                    sessionStorage.setItem('random_seen', JSON.stringify(seen));
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
