import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { collection, query, getDocs, doc, getDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import {
    BADGE_DEFINITIONS,
    getRank,
    getPageFanBadge,
} from '../utils/pointsEngine';
import { AlertTriangle, ExternalLink, Award, BookOpen, Edit3, Star, Eye } from 'lucide-react';

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-lg ${color}`}>
                <Icon size={22} className="text-white" />
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-900">{value ?? 0}</p>
                <p className="text-sm text-gray-500">{label}</p>
            </div>
        </div>
    );
}

function BadgeItem({ badge, earned, progressPct, currentValue }) {
    return (
        <div
            title={`${badge.desc} (${currentValue}/${badge.reqMin})`}
            className={`relative flex flex-col items-center gap-1 p-3 rounded-xl border transition-all overflow-hidden ${earned
                ? 'bg-gradient-to-b from-yellow-50 to-white border-yellow-200 shadow-sm'
                : 'bg-gray-50 border-gray-200 opacity-60 grayscale'
                }`}
        >
            <span className="text-2xl z-10">{badge.emoji}</span>
            <span className={`text-xs font-semibold z-10 text-center ${earned ? 'text-gray-800' : 'text-gray-500'}`}>
                {badge.label}
            </span>
            {!earned && (
                <span className="text-xs text-gray-500 z-10 drop-shadow-sm">🔒</span>
            )}

            {/* Progress Bar Background */}
            <div className="absolute bottom-0 left-0 h-1.5 w-full bg-gray-200" title={`${progressPct}%`}>
                <div
                    className={`h-full ${earned ? 'bg-yellow-400' : 'bg-blue-400'}`}
                    style={{ width: `${progressPct}%` }}
                />
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Dashboard() {
    const { currentUser, loginWithGoogle } = useAuth();
    const [userData, setUserData] = useState(null);
    const [contributions, setContributions] = useState([]);
    const [superfanPages, setSuperfanPages] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) { setLoading(false); return; }

        const fetchDashboardData = async () => {
            try {
                // Fetch user profile
                const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
                const ud = userSnap.exists() ? userSnap.data() : {};
                setUserData(ud);

                // Fetch pages where this user is a contributor using optimized query
                const q = query(
                    collection(db, 'entries'),
                    where('contributors_uids', 'array-contains', currentUser.uid)
                );
                const entriesSnap = await getDocs(q);
                const contrib = [];
                entriesSnap.forEach((d) => {
                    const data = d.data();
                    const match = (data.contributors || []).find((c) => c.uid === currentUser.uid);
                    if (match) {
                        contrib.push({
                            title: data.title,
                            id: d.id,
                            isCreator: data.creatorUid === currentUser.uid,
                            editCount: match.editCount || 0,
                            pointsEarned: match.pointsEarned || 0,
                            lastEditedAt: match.lastEditedAt,
                        });
                    }
                });
                setContributions(contrib.sort((a, b) => (b.lastEditedAt?.seconds || 0) - (a.lastEditedAt?.seconds || 0)));

                // Fetch superfan per-page data
                if (ud.pagesRead?.length) {
                    const sfPages = [];
                    for (const pageTitle of ud.pagesRead) {
                        const logSnap = await getDoc(doc(db, 'readLog', pageTitle, 'readers', currentUser.uid));
                        if (logSnap.exists()) {
                            const badge = getPageFanBadge(logSnap.data().readCount || 0);
                            if (badge) {
                                sfPages.push({ title: pageTitle, badge, readCount: logSnap.data().readCount });
                            }
                        }
                    }
                    setSuperfanPages(sfPages);
                }
            } catch (err) {
                console.error('Failed to load dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [currentUser]);

    // ── Auth guard ────────────────────────────────────────────────────────────
    if (!currentUser) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center max-w-2xl mx-auto mt-8">
                <Helmet><title>My Dashboard - Encyclopedia</title></Helmet>
                <AlertTriangle className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Login Required</h1>
                <p className="text-gray-600 mb-8">Sign in with Google to view your personal dashboard.</p>
                <button
                    onClick={loginWithGoogle}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md shadow-sm transition-colors"
                >
                    Sign in with Google
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    const rank = getRank(userData?.points || 0);
    const earnedBadgeIds = new Set(userData?.badges || []);
    const allBadges = Object.values(BADGE_DEFINITIONS).map(badge => {
        const curValue = badge.curStat(userData || {});
        const pct = Math.min(100, Math.floor((curValue / badge.reqMin) * 100));
        return { ...badge, pct, curValue };
    }).sort((a, b) => b.pct - a.pct);

    const writingBadges = allBadges.filter(b => b.category === 'Writing');
    const readingBadges = allBadges.filter(b => b.category === 'Reading');

    return (
        <div className="space-y-8">
            <Helmet>
                <title>My Dashboard - Encyclopedia</title>
                <meta name="robots" content="noindex" />
            </Helmet>

            {/* ── Profile Header ─────────────────────────────────────────────────── */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row items-center sm:items-start gap-6">
                {currentUser.photoURL ? (
                    <img
                        src={currentUser.photoURL}
                        alt={currentUser.displayName}
                        referrerPolicy="no-referrer"
                        className="w-20 h-20 rounded-full border-4 border-white/30 shadow-md shrink-0"
                    />
                ) : (
                    <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold shrink-0">
                        {currentUser.displayName?.[0] ?? '?'}
                    </div>
                )}
                <div>
                    <h1 className="text-2xl font-bold">{currentUser.displayName}</h1>
                    <p className="text-blue-200 text-sm mt-0.5">{currentUser.email}</p>
                    <span className="inline-block mt-3 px-3 py-1 rounded-full bg-white/20 text-sm font-semibold backdrop-blur-sm">
                        {rank}
                    </span>
                </div>
            </div>

            {/* ── Stat Cards ────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Edit3} label="Pages Created" value={userData?.totalPagesCreated} color="bg-green-500" />
                <StatCard icon={BookOpen} label="Total Edits" value={userData?.totalEdits} color="bg-blue-500" />
                <StatCard icon={Eye} label="Pages Read" value={userData?.totalPagesRead} color="bg-purple-500" />
                <StatCard icon={Star} label="Total Points" value={userData?.points} color="bg-yellow-500" />
            </div>

            {/* ── Badges Showcase ───────────────────────────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Award size={20} className="text-yellow-500" /> Earned & Locked Badges
                </h2>

                <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Writing Milestones</h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3">
                        {writingBadges.map((badge) => (
                            <BadgeItem
                                key={badge.id}
                                badge={badge}
                                earned={earnedBadgeIds.has(badge.id)}
                                progressPct={badge.pct}
                                currentValue={badge.curValue}
                            />
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 mt-6">Reading Milestones</h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3">
                        {readingBadges.map((badge) => (
                            <BadgeItem
                                key={badge.id}
                                badge={badge}
                                earned={earnedBadgeIds.has(badge.id)}
                                progressPct={badge.pct}
                                currentValue={badge.curValue}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Superfan Shoutouts ────────────────────────────────────────────── */}
            {superfanPages.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        ⭐ Your Fan Pages
                    </h2>
                    <div className="flex flex-wrap gap-3">
                        {superfanPages.map(({ title, badge, readCount }) => (
                            <Link
                                key={title}
                                to={`/wiki/${encodeURIComponent(title)}`}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-50 border border-yellow-200 hover:bg-yellow-100 transition-colors"
                            >
                                <span className="text-lg">{badge.emoji}</span>
                                <span className="font-medium text-gray-800">{title}</span>
                                <span className="text-xs text-gray-500 ml-1">{badge.label} · {readCount} reads</span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Contribution History ──────────────────────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Edit3 size={20} className="text-blue-500" /> Contribution History
                </h2>
                {contributions.length === 0 ? (
                    <p className="text-gray-500 text-sm">You haven't contributed to any pages yet. <Link to="/new" className="text-blue-600 hover:underline">Create one!</Link></p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 text-left text-gray-500">
                                    <th className="pb-3 pr-4 font-medium">Page</th>
                                    <th className="pb-3 pr-4 font-medium">Role</th>
                                    <th className="pb-3 pr-4 font-medium">Edits</th>
                                    <th className="pb-3 pr-4 font-medium">Points</th>
                                    <th className="pb-3 font-medium">Last Edited</th>
                                </tr>
                            </thead>
                            <tbody>
                                {contributions.map(({ title, isCreator, editCount, pointsEarned, lastEditedAt }) => (
                                    <tr key={title} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                                        <td className="py-3 pr-4">
                                            <Link
                                                to={`/wiki/${entry.id}`}
                                                className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                                            >
                                                {entry.title} <ExternalLink size={12} />
                                            </Link>
                                        </td>
                                        <td className="py-3 pr-4">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isCreator ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-50 text-blue-700'
                                                }`}>
                                                {isCreator ? '✏️ Creator' : '📝 Contributor'}
                                            </span>
                                        </td>
                                        <td className="py-3 pr-4 text-gray-700">{editCount}</td>
                                        <td className="py-3 pr-4 text-gray-700 font-semibold">+{pointsEarned} pts</td>
                                        <td className="py-3 text-gray-500">
                                            {lastEditedAt?.toDate
                                                ? lastEditedAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                                : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
