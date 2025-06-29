// src/symbols/ModernValveIcon.js
import React from 'react';

export default function ModernValveIcon({ width = 28, height = 28, status = 'online' }) {
    const getColors = () => {
        switch (status) {
            case 'online': return { primary: '#388E3C', secondary: '#C8E6C9', accent: '#1B5E20' };
            case 'warning': return { primary: '#F57C00', secondary: '#FFE0B2', accent: '#E65100' };
            case 'error': return { primary: '#D32F2F', secondary: '#FFCDD2', accent: '#B71C1C' };
            default: return { primary: '#757575', secondary: '#F5F5F5', accent: '#424242' };
        }
    };

    const colors = getColors();

    return (
        <svg width={width} height={height} viewBox="0 0 28 28">
            {/* Valve body */}
            <polygon
                points="14,4 24,14 14,24 4,14"
                fill={colors.secondary}
                stroke={colors.primary}
                strokeWidth="2"
            />
            {/* Inlet pipe */}
            <rect
                x="0" y="11" width="6" height="6"
                rx="3"
                fill={colors.accent}
            />
            {/* Outlet pipe */}
            <rect
                x="22" y="11" width="6" height="6"
                rx="3"
                fill={colors.accent}
            />
            {/* Actuator */}
            <circle
                cx="14" cy="6" r="4"
                fill={colors.primary}
                stroke={colors.accent}
                strokeWidth="1"
            />
            {/* Position indicator */}
            <line
                x1="14" y1="6" x2="14" y2="2"
                stroke="#FFD700"
                strokeWidth="2"
                strokeLinecap="round"
            />
            {/* Flow line */}
            <line
                x1="8" y1="14" x2="20" y2="14"
                stroke="#4CAF50"
                strokeWidth="2"
            />
            {/* Status indicator */}
            <circle
                cx="22" cy="6" r="2"
                fill="#4CAF50"
                stroke="#FFF"
                strokeWidth="1"
            />
        </svg>
    );
}