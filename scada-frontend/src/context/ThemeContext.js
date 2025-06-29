// src/context/ThemeContext.js - BEAUTIFUL FULL FEATURED VERSION
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    // Initialize theme from localStorage or default to 'light'
    const [mode, setMode] = useState(() => {
        const savedTheme = localStorage.getItem('scada-theme-mode');
        return savedTheme || 'light';
    });

    // Background style state (for different background patterns)
    const [backgroundStyle, setBackgroundStyle] = useState(() => {
        const savedBackground = localStorage.getItem('scada-background-style');
        return savedBackground || 'default';
    });

    // Save theme to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('scada-theme-mode', mode);
        console.log('🎨 Theme mode saved:', mode);
    }, [mode]);

    useEffect(() => {
        localStorage.setItem('scada-background-style', backgroundStyle);
        console.log('🎨 Background style saved:', backgroundStyle);
    }, [backgroundStyle]);

    // Toggle between light and dark mode
    const toggleTheme = () => {
        const newMode = mode === 'light' ? 'dark' : 'light';
        setMode(newMode);
        console.log('🎨 Theme toggled to:', newMode);
    };

    // Set specific theme mode
    const setThemeMode = (newMode) => {
        if (newMode === 'light' || newMode === 'dark') {
            setMode(newMode);
            console.log('🎨 Theme set to:', newMode);
        }
    };

    // Change background style
    const changeBackgroundStyle = (newStyle) => {
        const validStyles = ['default', 'geometric', 'circuit', 'industrial'];
        if (validStyles.includes(newStyle)) {
            setBackgroundStyle(newStyle);
            console.log('🎨 Background style changed to:', newStyle);
        }
    };

    // System theme detection
    const useSystemTheme = () => {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const systemMode = systemPrefersDark ? 'dark' : 'light';
        setMode(systemMode);
        console.log('🎨 Using system theme:', systemMode);
    };

    // Listen for system theme changes
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => {
            // Only auto-switch if user hasn't manually set a preference
            const hasManualPreference = localStorage.getItem('scada-theme-mode');
            if (!hasManualPreference) {
                setMode(e.matches ? 'dark' : 'light');
                console.log('🎨 System theme changed to:', e.matches ? 'dark' : 'light');
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const value = {
        // Current state
        mode,
        backgroundStyle,
        isDark: mode === 'dark',
        isLight: mode === 'light',

        // Theme controls
        toggleTheme,
        setThemeMode,
        changeBackgroundStyle,
        useSystemTheme,

        // Available options
        availableBackgrounds: ['default', 'geometric', 'circuit', 'industrial'],

        // Theme info
        themeInfo: {
            mode,
            backgroundStyle,
            isSystemDefault: !localStorage.getItem('scada-theme-mode')
        }
    };

    // Add CSS custom properties to root for dynamic theming
    useEffect(() => {
        const root = document.documentElement;

        if (mode === 'dark') {
            root.style.setProperty('--scada-bg-primary', '#0f172a');
            root.style.setProperty('--scada-bg-secondary', '#1e293b');
            root.style.setProperty('--scada-text-primary', '#f1f5f9');
            root.style.setProperty('--scada-text-secondary', '#94a3b8');
        } else {
            root.style.setProperty('--scada-bg-primary', '#ffffff');
            root.style.setProperty('--scada-bg-secondary', '#f8fafc');
            root.style.setProperty('--scada-text-primary', '#1e293b');
            root.style.setProperty('--scada-text-secondary', '#64748b');
        }
    }, [mode]);

    console.log('🎨 ThemeProvider rendering with:', { mode, backgroundStyle, isDark: mode === 'dark' });

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};