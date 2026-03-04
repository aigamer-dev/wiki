/**
 * CookieConsentBanner.jsx
 * GDPR-style banner shown until the user makes a decision.
 * Floats at the bottom of the viewport.
 */

import { useContext } from 'react';
import { CookieConsentContext } from './CookieConsentContext';
import { Cookie } from 'lucide-react';

export default function CookieConsentBanner() {
    const { cookieConsent, acceptCookies, denyCookies } = useContext(CookieConsentContext);

    // Already decided — don't show
    if (cookieConsent !== null) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
            <div className="max-w-4xl mx-auto bg-gray-900 text-white rounded-xl shadow-2xl border border-gray-700 flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5">
                <Cookie className="shrink-0 text-yellow-400" size={28} />
                <div className="flex-1 text-sm text-gray-300">
                    <p className="font-semibold text-white mb-0.5">Cookies &amp; Read Tracking</p>
                    <p>
                        We use cookies to count page reads accurately and prevent spam. No personal data is stored
                        for anonymous visitors — only timestamps per page. Your choice is remembered locally.
                    </p>
                </div>
                <div className="flex gap-3 shrink-0">
                    <button
                        onClick={denyCookies}
                        className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm font-medium text-gray-200 transition-colors"
                    >
                        Decline
                    </button>
                    <button
                        onClick={acceptCookies}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white transition-colors"
                    >
                        Accept
                    </button>
                </div>
            </div>
        </div>
    );
}
