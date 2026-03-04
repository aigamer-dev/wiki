import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { FileText, Search as SearchIcon, Eye, Clock, Calendar, ChevronRight, Filter, SortDesc, Tag } from 'lucide-react';

/**
 * Format a Firestore Timestamp or Date into a short relative/absolute label.
 * @param {import('firebase/firestore').Timestamp | null} ts
 * @returns {string}
 */
function formatDate(ts) {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Home() {
    const [entries, setEntries] = useState([]);
    const [filteredEntries, setFilteredEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [allTags, setAllTags] = useState([]);
    const [selectedTag, setSelectedTag] = useState('all');
    const [sortBy, setSortBy] = useState('popularity'); // 'popularity', 'newest', 'updated'
    const [searchParams, setSearchParams] = useSearchParams();
    const queryParam = searchParams.get('q');

    useEffect(() => {
        const fetchEntries = async () => {
            try {
                const q = query(collection(db, 'entries'));
                const snapshot = await getDocs(q);
                const fetched = [];
                const tagsSet = new Set();
                snapshot.forEach((d) => {
                    const data = d.data();
                    fetched.push({ id: d.id, ...data });
                    if (data.tags) {
                        data.tags.forEach(t => tagsSet.add(t));
                    }
                });

                setAllTags(Array.from(tagsSet).sort());
                setEntries(fetched);
            } catch (error) {
                console.error('Error fetching entries:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchEntries();
    }, []);

    useEffect(() => {
        let result = [...entries];

        // 1. Filter by Search Query
        if (queryParam) {
            const lower = queryParam.toLowerCase();
            result = result.filter((e) =>
                e.title.toLowerCase().includes(lower) ||
                (e.searchableText && e.searchableText.includes(lower)) ||
                (e.tags && e.tags.some(t => t.toLowerCase().includes(lower)))
            );
        }

        // 2. Filter by Selected Tag
        if (selectedTag !== 'all') {
            result = result.filter(e => e.tags && e.tags.includes(selectedTag));
        }

        // 3. Sort
        result.sort((a, b) => {
            if (sortBy === 'popularity') {
                return (b.readCount || 0) - (a.readCount || 0);
            } else if (sortBy === 'newest') {
                const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                const db = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                return db - da;
            } else if (sortBy === 'updated') {
                const da = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt || 0);
                const db = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt || 0);
                return db - da;
            }
            return 0;
        });

        setFilteredEntries(result);
    }, [queryParam, entries, selectedTag, sortBy]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    return (
        <div>
            <Helmet>
                <title>{queryParam ? `Search: ${queryParam} - Encyclopedia` : 'All Pages - Encyclopedia'}</title>
                <meta name="description" content="Browse all available encyclopedia entries on wiki.aigamer.dev." />
                <link rel="canonical" href="https://wiki.aigamer.dev" />
            </Helmet>

            {/* ── Header ───────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        {queryParam
                            ? <><SearchIcon size={22} className="text-blue-500" /> Results for &ldquo;{queryParam}&rdquo;</>
                            : <><FileText size={22} className="text-blue-500" /> All Pages</>}
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
                        {!queryParam && ' · sorted by popularity'}
                    </p>
                </div>
                <Link
                    to="/new"
                    className="hidden sm:inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-colors"
                >
                    + New Page
                </Link>
            </div>

            {/* ── Filter Bar ────────────────────────────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-8 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                        <Filter size={16} className="text-gray-400 shrink-0" />
                        <button
                            onClick={() => setSelectedTag('all')}
                            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${selectedTag === 'all'
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'
                                }`}
                        >
                            All Tags
                        </button>
                        {allTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => setSelectedTag(tag === selectedTag ? 'all' : tag)}
                                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${selectedTag === tag
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'
                                    }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <SortDesc size={16} className="text-gray-400" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="text-xs font-medium border-none bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-1.5 focus:ring-0 cursor-pointer transition-colors"
                        >
                            <option value="popularity">Most Popular</option>
                            <option value="newest">Newest First</option>
                            <option value="updated">Recently Updated</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* ── Cards Grid ───────────────────────────────────────────────── */}
            {filteredEntries.length > 0 ? (
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {filteredEntries.map((entry) => {
                        const readTimeMins = entry.readTimeMins ?? 1;
                        const readTimeLabel = `${readTimeMins} min read`;
                        const lastEdited = formatDate(entry.updatedAt || entry.createdAt);
                        const readCount = entry.readCount || 0;

                        return (
                            <li key={entry.id}>
                                <Link
                                    to={`/wiki/${entry.id}`}
                                    className="group flex flex-col h-full bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-blue-400 transition-all"
                                >
                                    {/* Title row */}
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-tight">
                                            {entry.title}
                                        </h2>
                                        <ChevronRight
                                            size={20}
                                            className="shrink-0 mt-0.5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all"
                                        />
                                    </div>

                                    {/* Snippet */}
                                    <p className="text-sm text-gray-600 line-clamp-3 mb-4 leading-relaxed">
                                        {entry.snippet || 'No description available for this entry.'}
                                    </p>

                                    {/* Creator pill */}
                                    {entry.creatorDisplayName && (
                                        <p className="text-xs text-gray-500 mb-4 flex items-center gap-1.5">
                                            {entry.creatorPhotoURL && (
                                                <img
                                                    src={entry.creatorPhotoURL}
                                                    alt={entry.creatorDisplayName}
                                                    referrerPolicy="no-referrer"
                                                    className="w-4 h-4 rounded-full"
                                                />
                                            )}
                                            by {entry.creatorDisplayName}
                                        </p>
                                    )}

                                    {/* Tags row */}
                                    {entry.tags && entry.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            {entry.tags.slice(0, 3).map(tag => (
                                                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px] uppercase font-bold tracking-wider">
                                                    <Tag size={10} />
                                                    {tag}
                                                </span>
                                            ))}
                                            {entry.tags.length > 3 && (
                                                <span className="text-[10px] text-gray-400 font-bold">+{entry.tags.length - 3}</span>
                                            )}
                                        </div>
                                    )}

                                    {/* Spacer */}
                                    <div className="flex-1" />

                                    {/* Metadata row */}
                                    <div className="flex items-center gap-4 flex-wrap pt-4 border-t border-gray-100 text-gray-400 text-xs">
                                        {readCount > 0 && (
                                            <span className="flex items-center gap-1">
                                                <Eye size={13} />
                                                {readCount.toLocaleString()} reads
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1">
                                            <Clock size={13} />
                                            {readTimeLabel}
                                        </span>
                                        {lastEdited && (
                                            <span className="flex items-center gap-1">
                                                <Calendar size={13} />
                                                Updated {lastEdited}
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <div className="text-center py-20">
                    <SearchIcon className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900">No pages found</h3>
                    <p className="text-gray-500 mt-1">No entries match your search.</p>
                    {queryParam && (
                        <Link to="/" className="mt-4 inline-block text-blue-600 hover:text-blue-800 font-medium">
                            ← View all pages
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}
