/**
 * ContributorCard.jsx
 * Displays a single contributor's avatar, name, role, and edit count.
 */

import { ExternalLink } from 'lucide-react';

const ROLE_STYLES = {
    creator: {
        label: 'Page Creator',
        className: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    },
    contributor: {
        label: 'Contributor',
        className: 'bg-blue-50 text-blue-700 border border-blue-200',
    },
};

/**
 * @param {{
 *   uid: string,
 *   displayName: string,
 *   photoURL: string,
 *   email: string,
 *   role: 'creator' | 'contributor',
 *   editCount: number,
 * }} props
 */
export default function ContributorCard({ uid, displayName, photoURL, email, role, editCount }) {
    const style = ROLE_STYLES[role] ?? ROLE_STYLES.contributor;

    return (
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
            {photoURL ? (
                <img
                    src={photoURL}
                    alt={displayName}
                    className="w-10 h-10 rounded-full object-cover border-2 border-gray-100 shrink-0"
                    referrerPolicy="no-referrer"
                />
            ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {displayName?.[0]?.toUpperCase() ?? '?'}
                </div>
            )}
            <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 text-sm truncate">{displayName || email}</p>
                <p className="text-xs text-gray-500 truncate">{editCount} {editCount === 1 ? 'edit' : 'edits'}</p>
            </div>
            <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${style.className}`}>
                {style.label}
            </span>
        </div>
    );
}
