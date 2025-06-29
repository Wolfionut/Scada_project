// src/symbols/ModernPumpIcon.js
import React from 'react';

export default function ModernPumpIcon({ width = 36, height = 28, status = 'online' }) {
    const getColors = () => {
        switch (status) {
            case 'online': return { primary: '#1976D2', secondary: '#BBDEFB', accent: '#0D47A1' };
            case 'warning': return { primary: '#F57C00', secondary: '#FFE0B2', accent: '#E65100' };
            case 'error': return { primary: '#D32F2F', secondary: '#FFCDD2', accent: '#B71C1C' };
            default: return { primary: '#757575', secondary: '#F5F5F5', accent: '#424242' };
        }
    };

    const colors = getColors();

    return (
        <svg width={width} height={height} viewBox="0 0 36 28">
            {/* Pump casing */}
            <circle
                cx="18" cy="14" r="10"
                fill={colors.secondary}
                stroke={colors.primary}
                strokeWidth="2"
            />
            {/* Impeller */}
            <circle
                cx="18" cy="14" r="6"
                fill={colors.primary}
                opacity="0.8"
            />
            {/* Inlet */}
            <rect
                x="2" y="11" width="8" height="6"
                rx="3"
                fill={colors.accent}
            />
            {/* Outlet */}
            <rect
                x="26" y="10" width="8" height="8"
                rx="4"
                fill={colors.accent}
            />
            {/* Motor */}
            <rect
                x="13" y="2" width="10" height="6"
                rx="2"
                fill={colors.primary}
            />
            {/* Flow arrow */}
            <polygon
                points="30,14 26,11 26,17"
                fill="#FFD700"
            />
            {/* Status indicator */}
            <circle
                cx="30" cy="6" r="3"
                fill="#4CAF50"
                stroke="#FFF"
                strokeWidth="1"
            />
        </svg>
    );
}