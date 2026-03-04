import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './components/AuthContext';
import { CookieConsentProvider } from './components/CookieConsentContext';
import CookieConsentBanner from './components/CookieConsentBanner';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import PageViewer from './pages/PageViewer';
import EditPage from './pages/EditPage';
import RandomRedirect from './pages/RandomRedirect';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <CookieConsentProvider>
          <Router>
            <div className="min-h-screen flex flex-col bg-gray-50">
              <Navbar />

              <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/wiki/:title" element={<PageViewer />} />
                  <Route path="/new" element={<EditPage isNew={true} />} />
                  <Route path="/wiki/:title/edit" element={<EditPage isNew={false} />} />
                  <Route path="/random" element={<RandomRedirect />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                </Routes>
              </main>

              <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
                  <p>&copy; {new Date().getFullYear()} AIGAMER. All rights reserved.</p>
                </div>
              </footer>

              {/* Cookie consent banner — shown until user decides */}
              <CookieConsentBanner />
            </div>
          </Router>
        </CookieConsentProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
