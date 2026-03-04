import { createContext, useContext, useEffect, useState } from "react";
import { auth, provider } from "../firebase";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const loginWithGoogle = async () => {
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error logging in:", error);
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const value = {
        currentUser,
        loginWithGoogle,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
