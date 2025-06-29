// src/context/AuthContext.js - DEBUG VERSION
import { createContext, useContext, useEffect, useState } from "react";
import { CircularProgress, Box } from "@mui/material";

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log('🔍 AuthContext useEffect triggered');

        // Check both localStorage and sessionStorage
        const userFromLocal = localStorage.getItem('user');
        const userFromSession = sessionStorage.getItem('user');
        const tokenFromLocal = localStorage.getItem('token');
        const tokenFromSession = sessionStorage.getItem('token');

        console.log('🔍 AuthContext - Checking storage...');
        console.log('🔍 localStorage user:', !!userFromLocal);
        console.log('🔍 sessionStorage user:', !!userFromSession);
        console.log('🔍 localStorage token:', !!tokenFromLocal);
        console.log('🔍 sessionStorage token:', !!tokenFromSession);

        // Use whichever storage has the user data
        const userData = userFromLocal || userFromSession;
        const tokenData = tokenFromLocal || tokenFromSession;

        console.log('🔍 Selected userData:', !!userData);
        console.log('🔍 Selected tokenData:', !!tokenData);

        if (userData && tokenData) {
            try {
                console.log('🔍 Found user and token, checking expiration...');
                console.log('🔍 Token (first 50 chars):', tokenData.substring(0, 50) + '...');

                // Check if token is expired
                const tokenPayload = JSON.parse(atob(tokenData.split('.')[1]));
                const currentTime = Date.now() / 1000;

                console.log('🔍 Token payload:', tokenPayload);
                console.log('🔍 Current time (unix):', currentTime);
                console.log('🔍 Token exp (unix):', tokenPayload.exp);
                console.log('🔍 Time difference:', tokenPayload.exp - currentTime, 'seconds');
                console.log('🔍 Minutes until expiry:', Math.floor((tokenPayload.exp - currentTime) / 60));

                if (tokenPayload.exp < currentTime) {
                    console.log('❌ TOKEN IS EXPIRED! Auto-logging out...');
                    console.log('❌ Token expired', Math.floor((currentTime - tokenPayload.exp) / 60), 'minutes ago');

                    // TEMPORARILY DISABLE AUTO-LOGOUT FOR DEBUGGING
                    console.log('🔧 DEBUG MODE: Skipping auto-logout');
                    console.log('🔧 In production, this would call logout()');

                    // Temporarily comment out the logout
                    // logout();

                    // Instead, let's see what happens if we continue
                    setUser(JSON.parse(userData));
                    console.log('🔧 DEBUG: Continuing with expired token for testing');

                    setLoading(false);
                    return;
                }

                console.log('✅ Token is valid, setting user');
                setUser(JSON.parse(userData));
                console.log('✅ AuthContext - User restored from storage');
            } catch (error) {
                console.log('❌ AuthContext - Error parsing stored data:', error);
                console.log('❌ userData:', userData);
                console.log('❌ tokenData:', tokenData);

                // For debugging, don't logout on parse errors
                console.log('🔧 DEBUG MODE: Not logging out on parse error');
                // logout();
            }
        } else {
            console.log('ℹ️ AuthContext - No user/token found in storage');
        }

        console.log('🔍 AuthContext setup complete, setting loading to false');
        setLoading(false);
    }, []);

    // Updated to handle rememberMe parameter
    const login = (userObj, token, rememberMe = false) => {
        console.log('✅ AuthContext - Login called with rememberMe:', rememberMe);

        if (rememberMe) {
            localStorage.setItem('user', JSON.stringify(userObj));
            localStorage.setItem('token', token);
            // Clear sessionStorage to avoid conflicts
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('token');
            console.log('✅ Saved to localStorage');
        } else {
            sessionStorage.setItem('user', JSON.stringify(userObj));
            sessionStorage.setItem('token', token);
            // Clear localStorage to avoid conflicts
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            console.log('✅ Saved to sessionStorage');
        }

        setUser(userObj);
        console.log('✅ AuthContext - User logged in successfully');
    };

    const logout = () => {
        console.log('🚨 AuthContext - LOGOUT CALLED!');
        console.log('🚨 Stack trace:', new Error().stack);

        // Clear both storages
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('token');
        setUser(null);

        console.log('🚨 User logged out, storage cleared');
    };

    if (loading) {
        console.log('⏳ AuthContext still loading...');
        return (
            <Box sx={{
                width: "100vw",
                height: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}>
                <CircularProgress sx={{ color: 'white' }} />
            </Box>
        );
    }

    console.log('🎯 AuthContext rendering with user:', !!user);

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}