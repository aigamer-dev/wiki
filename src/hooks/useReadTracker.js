/**
 * useReadTracker.js
 * Hook that fires a read event for a given page, enforcing:
 *  1. A 24-hour cooldown per reader (cookie or in-memory).
 *  2. A minimum time-on-page gate (20% of estimated read time) before the
 *     Firestore readCount is incremented. This prevents drive-by bounces
 *     from inflating the counter.
 */

import { useEffect, useRef, useContext } from 'react';
import { doc, getDoc, setDoc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { CookieConsentContext } from '../components/CookieConsentContext';
import { getBadges, getPageFanBadge } from '../utils/pointsEngine';

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const MIN_READ_FRACTION = 0.20;            // 20% of estimated read time

// ─── Cookie / Memory Helpers ──────────────────────────────────────────────────

function getCookie(name) {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name, value) {
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

const memoryCache = new Map();

function isFreshRead(pageTitle, cookieAllowed) {
    const key = `wikiread_${pageTitle}`;
    const stored = cookieAllowed ? getCookie(key) : memoryCache.get(key);
    if (!stored) return true;
    return Date.now() - parseInt(stored, 10) > COOLDOWN_MS;
}

function markAsRead(pageTitle, cookieAllowed) {
    const key = `wikiread_${pageTitle}`;
    if (cookieAllowed) setCookie(key, String(Date.now()));
    else memoryCache.set(key, Date.now());
}

// ─── Firestore updater for authenticated users ────────────────────────────────

async function recordAuthenticatedRead(uid, pageTitle) {
    const readLogRef = doc(db, 'readLog', pageTitle, 'readers', uid);
    const userRef = doc(db, 'users', uid);

    const logSnap = await getDoc(readLogRef);
    const newReadCount = (logSnap.exists() ? (logSnap.data().readCount || 0) : 0) + 1;

    await setDoc(readLogRef, {
        uid,
        readCount: newReadCount,
        lastReadAt: new Date(),
        firstReadAt: logSnap.exists() ? logSnap.data().firstReadAt : new Date(),
    }, { merge: true });

    // Per-page fan badges
    const pageFanBadges = [];
    if (newReadCount >= 5) pageFanBadges.push(`fan__${pageTitle}`);
    if (newReadCount >= 10) pageFanBadges.push(`encore__${pageTitle}`);
    if (newReadCount >= 20) pageFanBadges.push(`superfan__${pageTitle}`);

    // Aggregate user stats
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : {};
    const pagesRead = userData.pagesRead || [];
    const readCounts = userData.readCounts || {};

    const isNewPage = !pagesRead.includes(pageTitle);
    const newTotalRead = (userData.totalPagesRead || 0) + (isNewPage ? 1 : 0);
    const newBadges = getBadges({
        totalEdits: userData.totalEdits || 0,
        totalPagesCreated: userData.totalPagesCreated || 0,
        totalPagesRead: newTotalRead,
    });

    const nextCount = (readCounts[pageTitle] || 0) + 1;

    await setDoc(userRef, {
        totalPagesRead: newTotalRead,
        pagesRead: isNewPage ? arrayUnion(pageTitle) : (userData.pagesRead || []),
        readCounts: {
            ...readCounts,
            [pageTitle]: nextCount
        },
        badges: newBadges,
        pageFanBadges: pageFanBadges.length ? arrayUnion(...pageFanBadges) : (userData.pageFanBadges || []),
    }, { merge: true });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fire a read event for a page after the user has spent enough time on it.
 *
 * @param {string} pageTitle     - Title of the article.
 * @param {number} readTimeMs    - Full estimated read time in ms (from calculateReadTime).
 *                                 The increment fires after MIN_READ_FRACTION * readTimeMs.
 */
export function useReadTracker(pageTitle, readTimeMs) {
    const { currentUser } = useAuth();
    const { cookieConsent } = useContext(CookieConsentContext);
    const timerRef = useRef(null);

    useEffect(() => {
        if (!pageTitle || !readTimeMs) return;

        const cookieAllowed = cookieConsent === 'accepted';

        // If not a fresh read (within 24h), skip entirely
        if (!isFreshRead(pageTitle, cookieAllowed)) return;

        // Delay the Firestore write by 20% of estimated read time
        const delay = Math.max(5000, readTimeMs * MIN_READ_FRACTION); // min 5s

        timerRef.current = setTimeout(async () => {
            try {
                const entryRef = doc(db, 'entries', pageTitle);
                await updateDoc(entryRef, { readCount: increment(1) });
                markAsRead(pageTitle, cookieAllowed);

                if (currentUser) {
                    await recordAuthenticatedRead(currentUser.uid, pageTitle);
                }
            } catch (err) {
                console.warn('Read tracking failed silently:', err);
            }
        }, delay);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [pageTitle, readTimeMs, currentUser, cookieConsent]);
}
