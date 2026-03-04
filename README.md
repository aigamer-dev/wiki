# AI Gamer Encyclopedia

[![Firebase](https://img.shields.io/badge/firebase-%23039BE5.svg?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

A modern, fast, and secure encyclopedia application built with React, Vite, and Firebase. This platform allows authenticated users to create, edit, edit markdown articles with integrated syntax highlighting and live previews.

## Features

- **Markdown Support:** Full support for GitHub Flavored Markdown (GFM).
- **Categorization & Tagging:** Organize articles with tags and categories.
- **Search & Filtering:** Advanced search with sorting options (Popularity, Newest, Recently Updated).
- **Real-time Metrics:** Tracks read counts and contribution metrics.
- **Secure Authentication:** Integrated with Firebase Auth (Google Sign-In).
- **Responsive Design:** Optimized for mobile, tablet, and desktop devices.
- **SEO Optimized:** Utilizes `react-helmet-async` for dynamic meta tags.

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Lucide Icons
- **Backend/BaaS:** Firebase (Auth, Firestore, Cloud Storage)
- **Deployment:** GitHub Pages (Automated via GitHub Actions)
- **Domain:** [wiki.aigamer.dev](https://wiki.aigamer.dev)

## Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/aigamer-dev/wiki.git
   cd wiki
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env` file in the root directory and add your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment

This application is automatically deployed to GitHub Pages securely using GitHub Actions whenever changes are pushed to the `master` branch. All Firebase secrets are injected dynamically during the build step using GitHub Secrets.

## Contribution

Contributions are tracked via the integrated Dashboard. Each edit, create, and view action contributes to overall user statistics.
