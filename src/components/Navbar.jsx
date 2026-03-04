import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Menu, X, Search, BookOpen, Shuffle, PlusSquare, LogIn, LogOut, LayoutDashboard } from 'lucide-react';

export default function Navbar() {
    const { currentUser, loginWithGoogle, logout } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchQuery(val);
        // Real-time filtering if already on the Home page
        if (window.location.pathname === '/' && val.trim()) {
            navigate(`/?q=${encodeURIComponent(val)}`, { replace: true });
        } else if (window.location.pathname === '/' && !val.trim()) {
            navigate('/', { replace: true });
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/?q=${encodeURIComponent(searchQuery)}`);
            setIsMenuOpen(false);
        }
    };

    const NavLinks = ({ mobile = false }) => (
        <>
            <Link
                to="/"
                onClick={() => mobile && setIsMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md font-medium transition-colors ${mobile ? 'text-gray-900 hover:bg-gray-100' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
            >
                <BookOpen size={18} />
                Home
            </Link>
            <Link
                to="/random"
                onClick={() => mobile && setIsMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md font-medium transition-colors ${mobile ? 'text-gray-900 hover:bg-gray-100' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
            >
                <Shuffle size={18} />
                Random Page
            </Link>
            <Link
                to="/new"
                onClick={() => mobile && setIsMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md font-medium transition-colors ${mobile ? 'text-gray-900 hover:bg-gray-100' : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
            >
                <PlusSquare size={18} />
                Create New Page
            </Link>
        </>
    );

    return (
        <nav className="bg-gray-800 shadow-lg sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Logo and Desktop Nav */}
                    <div className="flex items-center">
                        <Link to="/" className="flex-shrink-0 flex items-center gap-3 mr-8">
                            <img
                                className="h-8 w-auto"
                                src="https://upload.wikimedia.org/wikipedia/en/thumb/8/80/Wikipedia-logo-v2.svg/1200px-Wikipedia-logo-v2.svg.png"
                                alt="Encyclopedia Logo"
                            />
                            <span className="text-white font-bold text-xl tracking-tight hidden sm:block">
                                Wiki
                            </span>
                        </Link>

                        <div className="hidden md:flex items-center space-x-1">
                            <NavLinks />
                        </div>
                    </div>

                    {/* Search and Auth (Desktop) */}
                    <div className="hidden md:flex items-center space-x-4">
                        <form onSubmit={handleSearchSubmit} className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                placeholder="Search encyclopedia..."
                                className="bg-gray-700 text-white placeholder-gray-400 rounded-full py-1.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-gray-600 transition-colors w-64"
                            />
                        </form>

                        {currentUser ? (
                            <div className="flex items-center gap-3">
                                <Link
                                    to="/dashboard"
                                    className="text-gray-300 hover:text-white hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    <LayoutDashboard size={16} />
                                    Dashboard
                                </Link>
                                <button
                                    onClick={logout}
                                    className="text-gray-300 hover:text-white hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    <LogOut size={16} />
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={loginWithGoogle}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                            >
                                <LogIn size={16} />
                                Login to Edit
                            </button>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <div className="flex items-center md:hidden">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white transition-colors"
                            aria-expanded="false"
                        >
                            <span className="sr-only">Open main menu</span>
                            {isMenuOpen ? (
                                <X className="block h-6 w-6" aria-hidden="true" />
                            ) : (
                                <Menu className="block h-6 w-6" aria-hidden="true" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu panel */}
            {isMenuOpen && (
                <div className="md:hidden bg-white shadow-xl absolute w-full rounded-b-lg border-t border-gray-200">
                    <div className="px-4 pt-4 pb-3 space-y-1">
                        <NavLinks mobile={true} />
                    </div>

                    <div className="px-4 py-3 border-t border-gray-200">
                        <form onSubmit={handleSearchSubmit} className="mb-4">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    placeholder="Search encyclopedia..."
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                                />
                            </div>
                        </form>

                        {currentUser ? (
                            <div className="flex items-center justify-between">
                                <Link to="/dashboard" className="flex items-center gap-3" onClick={() => setIsMenuOpen(false)}>
                                    <img
                                        src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.email}`}
                                        alt="Dashboard"
                                        referrerPolicy="no-referrer"
                                        className="h-10 w-10 rounded-full border-2 border-blue-400"
                                    />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900 truncate max-w-[150px]">{currentUser.displayName}</p>
                                        <p className="text-xs text-gray-500">View Dashboard</p>
                                    </div>
                                </Link>
                                <button
                                    onClick={() => { logout(); setIsMenuOpen(false); }}
                                    className="ml-auto bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                                >
                                    <LogOut size={16} />
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => {
                                    loginWithGoogle();
                                    setIsMenuOpen(false);
                                }}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex justify-center items-center gap-2"
                            >
                                <LogIn size={18} />
                                Sign in with Google
                            </button>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
