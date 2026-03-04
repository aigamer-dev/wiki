export const generateSlug = (title) => {
    if (!title) return '';
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
};

export const generateSnippet = (markdown) => {
    if (!markdown) return '';
    // Strip markdown formatting to get clean text for the snippet
    let text = markdown
        .replace(/^#+\s+(.*)$/gm, '') // Remove headers
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Extract link text
        .replace(/[*_~`]/g, '') // Remove simple formatting characters
        .replace(/^\s*[-*+]\s+/gm, '') // Remove list bullets
        .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered lists
        .replace(/\n/g, ' ') // Replace newlines with spaces
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .trim();

    return text.substring(0, 150) + (text.length > 150 ? '...' : '');
};
