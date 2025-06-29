// src/symbols/ModernTankIcon.js
import React from 'react';

export default function ModernTankIcon({ width = 32, height = 40, status = 'online' }) {
    const getColors = () => {
        switch (status) {
            case 'online': return { primary: '#2E7D32', secondary: '#A5D6A7', fill: '#1976D2' };
            case 'warning': return { primary: '#F57C00', secondary: '#FFB74D', fill: '#FFA726' };
            case 'error': return { primary: '#D32F2F', secondary: '#FFAB91', fill: '#F44336' };
            default: return { primary: '#757575', secondary: '#BDBDBD', fill: '#9E9E9E' };
        }
    };

    const colors = getColors();

    return (
        <svg width={width} height={height} viewBox="0 0 32 40">
            {/* Tank body */}
            <rect
                x="3" y="6" width="26" height="28"
                rx="4"
                fill={colors.secondary}
                stroke={colors.primary}
                strokeWidth="2"
            />
            {/* Liquid fill */}
            <rect
                x="5" y="15" width="22" height="17"
                rx="2"
                fill={colors.fill}
                opacity="0.8"
            />
            {/* Tank top */}
            <ellipse
                cx="16" cy="6" rx="13" ry="4"
                fill={colors.primary}
            />
            {/* Outlet */}
            <rect
                x="13" y="34" width="6" height="4"
                rx="2"
                fill={colors.primary}
            />
            {/* Status indicator */}
            <circle
                cx="26" cy="10" r="3"
                fill="#4CAF50"
                stroke="#FFF"
                strokeWidth="1"
            />
        </svg>
    );
}