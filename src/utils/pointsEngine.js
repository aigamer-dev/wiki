/**
 * pointsEngine.js
 * Pure utility functions for the gamification system.
 * No Firebase imports — all logic is deterministic and testable.
 */

// ─── Edit Scoring ────────────────────────────────────────────────────────────

/**
 * Calculate points earned for an edit based on how significant the change is.
 * Uses both absolute character delta AND percentage change — both must clear
 * the tier floor to prevent gaming (e.g., padding a tiny article by 1%).
 *
 * @param {string} oldContent - The content before the edit.
 * @param {string} newContent - The content after the edit.
 * @returns {number} Points awarded (0 if trivial).
 */
export function calculateEditPoints(oldContent, newContent) {
    const oldLen = oldContent.length;
    const newLen = newContent.length;
    const absDiff = Math.abs(newLen - oldLen);
    const pctChange = oldLen === 0 ? 1 : absDiff / oldLen;

    if (absDiff < 30 || pctChange < 0.01) return 0;   // Trivial
    if (absDiff < 150 || pctChange < 0.05) return 5;   // Minor
    if (absDiff < 500 || pctChange < 0.20) return 15;  // Moderate
    if (absDiff < 1500 || pctChange < 0.50) return 30; // Significant
    return 50;                                           // Major
}

// ─── Badge Logic ─────────────────────────────────────────────────────────────

/** All badge IDs and their metadata. */
export const BADGE_DEFINITIONS = {
    // Writing badges
    first_leaf: { id: 'first_leaf', category: 'Writing', emoji: '🌱', label: 'First Leaf', desc: 'Made your first edit', reqMin: 1, curStat: s => s.totalEdits || 0 },
    first_author: { id: 'first_author', category: 'Writing', emoji: '✏️', label: 'First Author', desc: 'Created your first page', reqMin: 1, curStat: s => s.totalPagesCreated || 0 },
    editor_5: { id: 'editor_5', category: 'Writing', emoji: '📝', label: 'Editor', desc: '5+ total edits', reqMin: 5, curStat: s => s.totalEdits || 0 },
    librarian_25: { id: 'librarian_25', category: 'Writing', emoji: '📚', label: 'Librarian', desc: '25+ total edits', reqMin: 25, curStat: s => s.totalEdits || 0 },
    scholar_40: { id: 'scholar_40', category: 'Writing', emoji: '🏆', label: 'Scholar', desc: '40+ total edits', reqMin: 40, curStat: s => s.totalEdits || 0 },
    grand_contributor: { id: 'grand_contributor', category: 'Writing', emoji: '🌟', label: 'Grand Contributor', desc: '50+ edits & 10+ pages', reqMin: 100, curStat: s => Math.floor(((Math.min(50, s.totalEdits || 0) / 50 + Math.min(10, s.totalPagesCreated || 0) / 10) / 2) * 100) },
    prolific_creator: { id: 'prolific_creator', category: 'Writing', emoji: '📖', label: 'Prolific Creator', desc: '20+ pages created', reqMin: 20, curStat: s => s.totalPagesCreated || 0 },
    // Reader badges
    curious_mind: { id: 'curious_mind', category: 'Reading', emoji: '👀', label: 'Curious Mind', desc: '5+ unique pages read', reqMin: 5, curStat: s => s.totalPagesRead || 0 },
    avid_reader: { id: 'avid_reader', category: 'Reading', emoji: '📰', label: 'Avid Reader', desc: '20+ unique pages read', reqMin: 20, curStat: s => s.totalPagesRead || 0 },
    deep_thinker: { id: 'deep_thinker', category: 'Reading', emoji: '🧠', label: 'Deep Thinker', desc: '50+ unique pages read', reqMin: 50, curStat: s => s.totalPagesRead || 0 },
    encyclopedist: { id: 'encyclopedist', category: 'Reading', emoji: '🌐', label: 'Encyclopedist', desc: '100+ unique pages read', reqMin: 100, curStat: s => s.totalPagesRead || 0 },
};

/**
 * Derive the full set of earned badge IDs from a user's stats.
 *
 * @param {{ totalEdits: number, totalPagesCreated: number, totalPagesRead: number }} stats
 * @returns {string[]} Array of earned badge IDs.
 */
export function getBadges({ totalEdits = 0, totalPagesCreated = 0, totalPagesRead = 0 }) {
    const earned = [];

    if (totalEdits >= 1) earned.push('first_leaf');
    if (totalPagesCreated >= 1) earned.push('first_author');
    if (totalEdits >= 5) earned.push('editor_5');
    if (totalEdits >= 25) earned.push('librarian_25');
    if (totalEdits >= 40) earned.push('scholar_40');
    if (totalEdits >= 50 && totalPagesCreated >= 10) earned.push('grand_contributor');
    if (totalPagesCreated >= 20) earned.push('prolific_creator');
    if (totalPagesRead >= 5) earned.push('curious_mind');
    if (totalPagesRead >= 20) earned.push('avid_reader');
    if (totalPagesRead >= 50) earned.push('deep_thinker');
    if (totalPagesRead >= 100) earned.push('encyclopedist');

    return earned;
}

// ─── Rank System ─────────────────────────────────────────────────────────────

const RANKS = [
    { label: '🌱 Seedling', min: 0 },
    { label: '📝 Apprentice', min: 50 },
    { label: '📖 Scholar', min: 150 },
    { label: '🔬 Researcher', min: 400 },
    { label: '🏛️ Archivist', min: 800 },
    { label: '👑 Grand Master', min: 1500 },
];

/**
 * Derive rank label from total points.
 * @param {number} points
 * @returns {string}
 */
export function getRank(points) {
    let rank = RANKS[0];
    for (const r of RANKS) {
        if (points >= r.min) rank = r;
    }
    return rank.label;
}

// ─── Per-page fan tier ───────────────────────────────────────────────────────

/**
 * Get the per-page fan badge for a given read count.
 * @param {number} readCount
 * @returns {{ emoji: string, label: string } | null}
 */
export function getPageFanBadge(readCount) {
    if (readCount >= 20) return { emoji: '⭐', label: 'Superfan' };
    if (readCount >= 10) return { emoji: '🔂', label: 'Encore' };
    if (readCount >= 5) return { emoji: '📌', label: 'Fan' };
    return null;
}

// ─── Read Time Estimation ─────────────────────────────────────────────────────

/** WPM rates per content type (reading speed). */
const WPM = { heading: 200, code: 100, body: 250 };

/**
 * Estimate the read time of a markdown string.
 * Differentiates WPM for headings, code blocks, and body text.
 *
 * @param {string} markdownContent
 * @returns {{ minutes: number, label: string, milliseconds: number }}
 */
export function calculateReadTime(markdownContent) {
    if (!markdownContent) return { minutes: 1, label: '1 min read', milliseconds: 60000 };

    let effectiveWords = 0;
    const lines = markdownContent.split('\n');
    let inCodeBlock = false;

    for (const line of lines) {
        if (line.startsWith('```')) { inCodeBlock = !inCodeBlock; continue; }
        const words = line.trim().split(/\s+/).filter(Boolean).length;
        if (!words) continue;

        if (inCodeBlock) {
            // Code reads slower — scale up effective word count
            effectiveWords += words * (WPM.body / WPM.code);
        } else if (/^#{1,6}\s/.test(line)) {
            // Headings read slightly slower
            effectiveWords += words * (WPM.body / WPM.heading);
        } else {
            effectiveWords += words;
        }
    }

    const minutes = Math.max(1, Math.ceil(effectiveWords / WPM.body));
    return { minutes, label: `${minutes} min read`, milliseconds: minutes * 60 * 1000 };
}

