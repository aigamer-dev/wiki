import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { doc, onSnapshot } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Edit, FileQuestion, Eye, Users, Clock, RefreshCw, Tag, Loader2 } from 'lucide-react';
import ContributorCard from '../components/ContributorCard';
import { useReadTracker } from '../hooks/useReadTracker';
import { calculateReadTime } from '../utils/pointsEngine';

// Lazy load heavy components
const ReactMarkdown = lazy(() => import('react-markdown'));
const remarkGfm = lazy(() => import('remark-gfm'));
const SyntaxHighlighter = lazy(() => import('react-syntax-highlighter').then(m => ({ default: m.Prism })));
const vscDarkPlus = lazy(() => import('react-syntax-highlighter/dist/esm/styles/prism').then(m => ({ default: m.vscDarkPlus })));
export default function PageViewer() {
    const { title } = useParams();
    const [content, setContent] = useState('');
    const [metadata, setMetadata] = useState(null);
    const [loading, setLoading] = useState(true);
    const [exists, setExists] = useState(false);
    const [readTime, setReadTime] = useState(null);
    const [contentUpdated, setContentUpdated] = useState(false);

    // Fire read tracking after user spends 20% of estimated read time on page
    useReadTracker(title, readTime?.milliseconds);

    useEffect(() => {
        if (!title) return;

        let initialLoadDone = false;
        let initialUpdatedAt = null;

        const unsubscribe = onSnapshot(doc(db, 'entries', title), async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setMetadata(data);

                if (!initialLoadDone) {
                    // First time loading the page
                    initialUpdatedAt = data.updatedAt?.toMillis() || 0;
                    if (data.storagePath) {
                        try {
                            const url = await getDownloadURL(ref(storage, data.storagePath));
                            const response = await fetch(url);
                            const text = await response.text();
                            setContent(text);
                            setReadTime(calculateReadTime(text));
                        } catch (e) {
                            console.error('Failed to load content from storage', e);
                            setContent('*Failed to load content from storage. Please try refreshing.*');
                        }
                    } else if (data.content) {
                        setContent(data.content);
                        setReadTime(calculateReadTime(data.content));
                    }
                    setExists(true);
                    setLoading(false);
                    initialLoadDone = true;
                } else {
                    // Real-time metadata update (e.g., read counts, contributors). 
                    // Let's check if the content itself was modified.
                    const currentUpdatedAt = data.updatedAt?.toMillis() || 0;
                    if (currentUpdatedAt > initialUpdatedAt) {
                        setContentUpdated(true);
                    }
                }
            } else {
                setExists(false);
                setLoading(false);
            }
        }, (error) => {
            console.error('Error fetching document snapshot:', error);
            if (!initialLoadDone) {
                setExists(false);
                setLoading(false);
                initialLoadDone = true;
            }
        });

        return () => unsubscribe();
    }, [title]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    if (!exists) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center max-w-2xl mx-auto mt-8">
                <Helmet>
                    <title>Page Not Found - Encyclopedia</title>
                    <meta name="robots" content="noindex" />
                </Helmet>
                <FileQuestion className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Page Not Found</h1>
                <p className="text-gray-600 mb-8 text-lg">
                    The requested page <strong className="text-gray-900">"{title}"</strong> does not exist yet.
                </p>
                <Link
                    to="/new"
                    state={{ defaultTitle: title }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md shadow-sm transition-colors inline-flex items-center gap-2"
                >
                    <Edit size={18} />
                    Create This Page
                </Link>
            </div>
        );
    }

    const contributors = metadata?.contributors || [];
    const creatorUid = metadata?.creatorUid;

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <Helmet>
                <title>{metadata?.title || title} - Encyclopedia</title>
                <meta name="description" content={`Read the encyclopedia entry about ${metadata?.title || title}.`} />
                <link rel="canonical" href={`https://wiki.aigamer.dev/wiki/${encodeURIComponent(title)}`} />
            </Helmet>

            {/* ── Page Header ─────────────────────────────────────────────── */}
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex items-start sm:items-center justify-between flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-gray-900 break-words">{metadata?.title || title}</h1>
                <div className="flex items-center gap-4 flex-wrap">
                    {/* Tags */}
                    {metadata?.tags && metadata.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {metadata.tags.map(tag => (
                                <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100 shadow-sm">
                                    <Tag size={12} />
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                    {/* Read count */}
                    {(metadata?.readCount ?? 0) > 0 && (
                        <span className="flex items-center gap-1.5 text-sm text-gray-500 transition-all duration-300">
                            <Eye size={16} />
                            {metadata.readCount.toLocaleString()} {metadata.readCount === 1 ? 'read' : 'reads'}
                        </span>
                    )}
                    {/* Read time */}
                    {readTime && (
                        <span className="flex items-center gap-1.5 text-sm text-gray-500">
                            <Clock size={16} />
                            {readTime.label}
                        </span>
                    )}
                    <Link
                        to={`/wiki/${encodeURIComponent(title)}/edit`}
                        className="text-blue-600 hover:text-white border border-blue-600 hover:bg-blue-600 font-medium rounded-md text-sm px-4 py-2 transition-colors inline-flex items-center gap-2 shadow-sm whitespace-nowrap"
                    >
                        <Edit size={16} />
                        Edit Page
                    </Link>
                </div>
            </div>

            {/* ── Update Banner ─────────────────────────────────────────── */}
            {contentUpdated && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 m-6 rounded-r-md shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
                    <div className="flex items-start">
                        <RefreshCw className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-blue-800">
                                This page has been updated by a contributor!
                            </p>
                            <p className="text-sm text-blue-600 mt-1">
                                Reload to read the latest version of the content.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="text-sm border border-transparent bg-blue-600 text-white px-4 py-2 rounded-md shadow hover:bg-blue-700 transition font-medium whitespace-nowrap"
                    >
                        Reload Page
                    </button>
                </div>
            )}

            {/* ── Article Content ─────────────────────────────────────────── */}
            <div className="p-6 md:p-8">
                <Suspense fallback={
                    <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-3" />
                        <p className="text-sm text-gray-500 font-medium">Parsing and rendering content...</p>
                    </div>
                }>
                    <article className="prose prose-slate lg:prose-lg max-w-none prose-headings:font-bold prose-a:text-blue-600 hover:prose-a:text-blue-800 prose-img:rounded-xl">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                code({ node, inline, className, children, ...props }) {
                                    const match = /language-(\w+)/.exec(className || '');
                                    return !inline && match ? (
                                        <Suspense fallback={<pre className="bg-gray-900 rounded-md p-4 animate-pulse h-24" />}>
                                            <SyntaxHighlighter
                                                style={vscDarkPlus}
                                                language={match[1]}
                                                PreTag="div"
                                                className="rounded-md shadow-sm border border-gray-700"
                                                {...props}
                                            >
                                                {String(children).replace(/\n$/, '')}
                                            </SyntaxHighlighter>
                                        </Suspense>
                                    ) : (
                                        <code className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded-md text-sm font-mono" {...props}>
                                            {children}
                                        </code>
                                    );
                                },
                            }}
                        >
                            {content}
                        </ReactMarkdown>
                    </article>
                </Suspense>
            </div>

            {/* ── Contributors Section ─────────────────────────────────────── */}
            {contributors.length > 0 && (
                <div className="border-t border-gray-200 px-6 md:px-8 py-6 bg-gray-50">
                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <Users size={16} className="text-gray-500" />
                        Contributors
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {contributors.map((c) => (
                            <ContributorCard
                                key={c.uid}
                                {...c}
                                role={c.uid === creatorUid ? 'creator' : 'contributor'}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
