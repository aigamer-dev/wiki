import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getStorage, ref, uploadString } from "firebase/storage";

const firebaseConfig = {
    projectId: "aigamer-encyclopedia-v3",
    appId: "1:363809660823:web:56c9cde0bc71196b646ed2",
    storageBucket: "aigamer-encyclopedia-v3.firebasestorage.app",
    apiKey: "AIzaSyB3M4C4_6jQfwu7cepg6lYVsjC6FnbaORc",
    authDomain: "aigamer-encyclopedia-v3.firebaseapp.com",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

const entries = [
    {
        title: "Artificial Intelligence",
        content: "# Artificial Intelligence\n\nArtificial intelligence (AI) refers to the capability of computers or machines to simulate human intelligence, enabling them to perform complex tasks that typically require human cognitive abilities such as learning, comprehension, problem-solving, decision-making, creativity, and autonomy.\n\n## Categories\n*   **Artificial Narrow Intelligence (ANI)**: Currently the most common form, encompassing generative AI. Operates within defined parameters.\n*   **Artificial General Intelligence (AGI)**: A theoretical intelligence across a wide range of tasks matching or exceeding a human.\n*   **Generative AI (GenAI)**: A subset that generates completely new realistic content (text, audio, video) based on learned patterns from massive datasets.\n\n## History Timeline\n- **1930s-1940s**: Alan Turing describes an abstract computing machine.\n- **1950**: Turing proposes the \"Turing Test\".\n- **1956**: The term \"Artificial Intelligence\" is officially coined at Dartmouth College by John McCarthy.\n- **1997**: Deep Blue beats Garry Kasparov at Chess.\n\n## Applications\nCustomer service chatbots, computer vision, predicting machine maintenance routines, data pattern generation for targeted ads, and advanced robotics.",
    },
    {
        title: "React",
        content: "# React (JavaScript library)\n\nReact (also known as React.js) is an open-source JavaScript library primarily used for building dynamic, interactive user interfaces for single-page web applications. It is maintained by Meta (formerly Facebook) alongside a large community of developers.\n\n## Core Concepts\n\n### Components\nUI elements are broken down into isolated, reusable blocks of code called components. Components can be written as JavaScript classes or simple functions.\n\n### JSX (JavaScript XML)\nJSX enables writing HTML-like markup directly within JavaScript code. This makes template visualization far easier than managing raw Javascript DOM creation steps.\n\n### Virtual DOM\nInstead of making expensive operations directly against the Document Object Model, React keeps a lightweight cloned state in memory. When state shifts, it runs a \"diffing\" reconciliation algorithm against the old VD and patches only exact changed targets on the real DOM.",
    },
    {
        title: "Firebase",
        content: "# Firebase\n\nFirebase is a comprehensive mobile and web application development platform acting as a Backend-as-a-Service (BaaS). Bought by Google, it significantly speeds up MVP prototyping by removing the headache of writing custom boilerplate servers.\n\n## Major Offerings\n\n1. You can access the **Cloud Firestore** which represents a flexible NoSQL document database. It seamlessly maps to collections and handles auto-scaling.\n2. Leverage simple **Authentication** UI libraries to handle JWT handshakes across Google, GitHub, Apple or password providers securely.\n3. The platform provides global **Hosting** relying on Google's CDN networks for fast distribution with SSL enabled out of the box.\n4. Deploy serverless edge code utilizing **Cloud Functions**.",
    },
    {
        title: "Markdown",
        content: "# Markdown\n\nMarkdown is a lightweight markup language designed to be easy to read and write without heavy tag clutters. It parses plain text formatting syntax into structured HTML output.\n\n## Common Syntax Elements\n\n### Headings\nUsed via hash symbols `#`\n```markdown\n# H1\n## H2\n### H3\n```\n\n### Rich Text Variants\nIt lets you render text in *italic* (\`*italic*\`) or **bold** (\`**bold**\`).\n\n### Code Embeds\nWrap plain text inside triple backticks to inject code blocks:\n```javascript\nfunction helloInternet() {\n  return \"Welcome to the Wiki!\";\n}\n```",
    }
];

const generateSlug = (title) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

const generateSnippet = (markdown) => {
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

async function seed() {
    for (const entry of entries) {
        console.log(`Seeding ${entry.title}...`);
        try {
            const slug = generateSlug(entry.title);
            const storagePath = `entries/${slug}.md`;
            const storageRef = ref(storage, storagePath);

            // Upload markdown content to Storage
            await uploadString(storageRef, entry.content);

            const snippet = generateSnippet(entry.content);

            // Save metadata to Firestore using slug as the Document ID
            await setDoc(doc(db, "entries", slug), {
                title: entry.title,
                storagePath: storagePath,
                searchableText: entry.content.toLowerCase(),
                snippet,
                readTimeMins: Math.max(1, Math.ceil((entry.content.match(/\w+/g) || []).length / 250)),
                authorEmail: "system@wikipedia.com",
                createdAt: new Date()
            });
            console.log(`Success: ${entry.title} (Slug: ${slug})`);
        } catch (e) {
            console.error(`Failed on ${entry.title}:`, e);
        }
    }
    console.log("Finished seeding process!");
    process.exit(0);
}

seed();
