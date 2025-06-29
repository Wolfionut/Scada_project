// src/symbols/ModernMotorIcon.js
import React from 'react';

export default function ModernMotorIcon({ width = 32, height = 28, status = 'online' }) {
    const getColors = () => {
        switch (status) {
            case 'online': return { primary: '#1976D2', secondary: '#E3F2FD', accent: '#0D47A1' };
            case 'warning': return { primary: '#F57C00', secondary: '#FFF3E0', accent: '#E65100' };
            case 'error': return { primary: '#D32F2F', secondary: '#FFEBEE', accent: '#B71C1C' };
            default: return { primary: '#757575', secondary: '#FAFAFA', accent: '#424242' };
        }
    };

    const colors = getColors();

    return (
        <svg width={width} height={height} viewBox="0 0 32 28">
            {/* Motor frame */}
            <rect
                x="3" y="6" width="22" height="16"
                rx="4"
                fill={colors.secondary}
                stroke={colors.primary}
                strokeWidth="2"
            />
            {/* Stator */}
            <circle
                cx="14" cy="14" r="6"
                fill={colors.primary}
                opacity="0.7"
            />
            {/* Rotor */}
            <circle
                cx="14" cy="14" r="4"
                fill={colors.accent}
            />
            {/* Shaft */}
            <rect
                x="25" y="12" width="6" height="4"
                rx="2"
                fill={colors.accent}
            />
            {/* Terminal box */}
            <rect
                x="10" y="2" width="8" height="4"
                rx="1"
                fill={colors.primary}
            />
            {/* Cooling fins */}
            <g stroke={colors.accent} strokeWidth="1">
                <line x1="6" y1="22" x2="6" y2="25" />
                <line x1="10" y1="22" x2="10" y2="25" />
                <line x1="14" y1="22" x2="14" y2="25" />
                <line x1="18" y1="22" x2="18" y2="25" />
                <line x1="22" y1="22" x2="22" y2="25" />
            </g>
            {/* "M" marking */}
            <path
                d="M 8 12 L 9 16 L 11 13 L 13 16 L 14 12"
                fill="none"
                stroke={colors.primary}
                strokeWidth="1.5"
            />
            {/* Status indicator */}
            <circle
                cx="26" cy="6" r="3"
                fill="#4CAF50"
                stroke="#FFF"
                strokeWidth="1"
            />
        </svg>
    );
}