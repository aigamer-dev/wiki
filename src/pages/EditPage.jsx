import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
    doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp,
} from 'firebase/firestore';
import { ref, getDownloadURL, uploadString } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { calculateEditPoints, getBadges, calculateReadTime } from '../utils/pointsEngine';
import { generateSlug, generateSnippet } from '../utils/textUtils';
import { FileEdit, Save, XCircle, AlertTriangle } from 'lucide-react';

export default function EditPage({ isNew }) {
    const { title: paramTitle } = useParams();
    const { state } = useLocation();
    const { currentUser, loginWithGoogle } = useAuth();
    const navigate = useNavigate();

    const [title, setTitle] = useState(isNew ? (state?.defaultTitle || '') : paramTitle);
    const [content, setContent] = useState('');
    const [tags, setTags] = useState('');
    const [originalContent, setOriginalContent] = useState('');
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isNew && paramTitle) {
            const fetchPage = async () => {
                try {
                    const docRef = doc(db, 'entries', paramTitle);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        if (data.storagePath) {
                            try {
                                const storageRef = ref(storage, data.storagePath);
                                const url = await getDownloadURL(storageRef);
                                const response = await fetch(url);
                                const text = await response.text();
                                setContent(text);
                                setTags(data.tags ? data.tags.join(', ') : '');
                                setOriginalContent(text);
                            } catch (e) {
                                console.error('Failed to fetch markdown from Storage.', e);
                            }
                        } else if (data.content) {
                            setContent(data.content);
                            setOriginalContent(data.content);
                        }
                    } else {
                        setError(`The page "${paramTitle}" does not exist. You can create it instead.`);
                    }
                } catch (err) {
                    console.error('Error fetching document:', err);
                    setError('Failed to load page content.');
                } finally {
                    setLoading(false);
                }
            };
            fetchPage();
        } else {
            setLoading(false);
        }
    }, [isNew, paramTitle]);

    /** Upsert the users/{uid} document with updated stats, points, and badges. */
    const upsertUserProfile = async ({ pointsEarned, isNewPage }) => {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        const existing = userSnap.exists() ? userSnap.data() : {};

        const totalEdits = (existing.totalEdits || 0) + 1;
        const totalPagesCreated = (existing.totalPagesCreated || 0) + (isNewPage ? 1 : 0);
        const totalPagesRead = existing.totalPagesRead || 0;
        const points = (existing.points || 0) + pointsEarned;
        const badges = getBadges({ totalEdits, totalPagesCreated, totalPagesRead });

        await setDoc(userRef, {
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            email: currentUser.email,
            totalEdits,
            totalPagesCreated,
            totalPagesRead,
            points,
            badges,
            joinedAt: existing.joinedAt || new Date(),
        }, { merge: true });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        if (!title.trim() || !content.trim()) {
            setError('Title and content cannot be empty.');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const trimmedTitle = title.trim();
            const tagList = tags.split(',').map(t => t.trim().toLowerCase()).filter(t => t !== '');
            const slug = generateSlug(trimmedTitle);
            const docRef = doc(db, 'entries', slug);

            if (isNew) {
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setError(`An entry named "${trimmedTitle}" already exists.`);
                    setSaving(false);
                    return;
                }
            }

            // Upload markdown to Cloud Storage
            const storagePath = `entries/${slug}.md`;
            await uploadString(ref(storage, storagePath), content);

            // Calculate edit points and read time
            const pointsEarned = isNew ? 50 : calculateEditPoints(originalContent, content);
            const readTimeMins = calculateReadTime(content).minutes;

            // Build the contributor object for this user
            const contributorEntry = {
                uid: currentUser.uid,
                displayName: currentUser.displayName || currentUser.email,
                photoURL: currentUser.photoURL || '',
                email: currentUser.email,
                editCount: 1, // will be incremented below for edits
                pointsEarned,
                lastEditedAt: new Date(),
            };

            // Generate snippet by stripping basic markdown
            const snippet = generateSnippet(content);

            if (isNew) {
                // ── Create new page ──────────────────────────────────────────────
                await setDoc(docRef, {
                    title: trimmedTitle,
                    storagePath,
                    readTimeMins,
                    searchableText: content.toLowerCase(),
                    snippet,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    creatorUid: currentUser.uid,
                    creatorDisplayName: currentUser.displayName || currentUser.email,
                    creatorPhotoURL: currentUser.photoURL || '',
                    readCount: 0,
                    tags: tagList,
                    contributors: [contributorEntry],
                    contributors_uids: [currentUser.uid],
                });
            } else {
                // ── Edit existing page ───────────────────────────────────────────
                if (pointsEarned === 0) {
                    // Trivial edit — still save the content but award no points
                    await updateDoc(docRef, {
                        storagePath,
                        updatedAt: serverTimestamp(),
                    });
                    navigate(`/wiki/${slug}`);
                    return;
                }

                // Merge contributor into the array
                const entrySnap = await getDoc(docRef);
                const entryData = entrySnap.data() || {};
                const existingContributors = entryData.contributors || [];
                const existingIdx = existingContributors.findIndex((c) => c.uid === currentUser.uid);

                let updatedContributors;
                if (existingIdx >= 0) {
                    // Increment existing contributor
                    updatedContributors = existingContributors.map((c, i) =>
                        i === existingIdx
                            ? {
                                ...c,
                                editCount: (c.editCount || 0) + 1,
                                pointsEarned: (c.pointsEarned || 0) + pointsEarned,
                                lastEditedAt: new Date(),
                            }
                            : c
                    );
                } else {
                    // New contributor to this page
                    updatedContributors = [...existingContributors, contributorEntry];
                }

                await updateDoc(docRef, {
                    storagePath,
                    readTimeMins,
                    searchableText: content.toLowerCase(),
                    snippet,
                    updatedAt: serverTimestamp(),
                    tags: tagList,
                    contributors: updatedContributors,
                    contributors_uids: arrayUnion(currentUser.uid),
                });
            }

            // Update user profile with new stats + badges
            await upsertUserProfile({ pointsEarned, isNewPage: isNew });

            navigate(`/wiki/${slug}`);
        } catch (err) {
            console.error('Error saving document:', err);
            setError('Failed to save entry. Please try again.');
            setSaving(false);
        }
    };

    if (!currentUser) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center max-w-2xl mx-auto mt-8">
                <Helmet>
                    <title>Login Required - Encyclopedia</title>
                    <meta name="robots" content="noindex" />
                </Helmet>
                <AlertTriangle className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Authentication Required</h1>
                <p className="text-gray-600 mb-8 text-lg">
                    You must be logged in with a Google account to {isNew ? 'create' : 'edit'} encyclopedia entries.
                </p>
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

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden max-w-4xl mx-auto">
            <Helmet>
                <title>{isNew ? 'Create New Page' : `Edit: ${title}`} - Encyclopedia</title>
                <meta name="robots" content="noindex" />
            </Helmet>

            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <FileEdit className="text-blue-500" />
                    {isNew ? 'Create New Entry' : `Edit Entry: ${paramTitle}`}
                </h1>
            </div>

            <div className="p-6 md:p-8">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-3 text-red-700">
                        <XCircle className="shrink-0 mt-0.5" size={20} />
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                            Page Title
                        </label>
                        <input
                            type="text"
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={!isNew}
                            placeholder="e.g. Python, Machine Learning, World War II"
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-3 disabled:bg-gray-100 disabled:text-gray-500"
                            required
                        />
                        {!isNew && (
                            <p className="mt-1 text-xs text-gray-500">The title of an existing page cannot be changed.</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                            Tags (comma separated)
                        </label>
                        <input
                            type="text"
                            id="tags"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="e.g. technology, react, guide"
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-3"
                        />
                    </div>

                    <div>
                        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
                            <span>Markdown Content</span>
                            <a
                                href="https://www.markdownguide.org/cheat-sheet/"
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                                Formatting Guide ↗
                            </a>
                        </label>
                        <textarea
                            id="content"
                            rows={18}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder={"# Heading 1\n\nWrite your markdown content here...\n\n- Bullet point\n- Bullet point\n\n[Link to another page](/wiki/Title)"}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-4 font-mono leading-relaxed"
                            required
                        />
                        {!isNew && (
                            <p className="mt-1 text-xs text-gray-500">
                                ⚡ Points are awarded based on the significance of your edit. Minor changes (less than 30 characters) earn no points.
                            </p>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => navigate(isNew ? '/' : `/wiki/${encodeURIComponent(paramTitle)}`)}
                            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex justify-center items-center gap-2 py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {saving ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={16} />
                                    Save Page
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
