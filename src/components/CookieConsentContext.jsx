/**
 * CookieConsentContext.jsx
 * Provides cookie consent state globally so all components (especially
 * useReadTracker) can check whether persistence is allowed.
 */

import { createContext, useState, useEffect } from 'react';

export const CookieConsentContext = createContext({
    cookieConsent: null,
    acceptCookies: () => { },
    denyCookies: () => { },
});

const STORAGE_KEY = 'wiki_cookie_consent';

export function CookieConsentProvider({ children }) {
    const [cookieConsent, setCookieConsent] = useState(null); // null = not yet decided

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'accepted' || stored === 'denied') {
            setCookieConsent(stored);
        }
    }, []);

    const acceptCookies = () => {
        localStorage.setItem(STORAGE_KEY, 'accepted');
        setCookieConsent('accepted');
    };

    const denyCookies = () => {
        localStorage.setItem(STORAGE_KEY, 'denied');
        setCookieConsent('denied');
    };

    return (
        <CookieConsentContext.Provider value={{ cookieConsent, acceptCookies, denyCookies }}>
            {children}
        </CookieConsentContext.Provider>
    );
}
