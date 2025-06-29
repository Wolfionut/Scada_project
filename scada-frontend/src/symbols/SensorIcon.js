import React from 'react';

export default function SensorIcon({ width = 32, height = 32 }) {
    return (
        <svg width={width} height={height} viewBox="0 0 48 48">
            <rect x="0" y="12" width="48" height="24" rx="10" fill="#ffe082" stroke="#ff8f00" strokeWidth="3"/>
            <circle cx="24" cy="43" r="5" fill="#ff8f00" />
            <line x1="24" y1="12" x2="24" y2="4" stroke="#ff8f00" strokeWidth="3"/>
        </svg>
    );
}
