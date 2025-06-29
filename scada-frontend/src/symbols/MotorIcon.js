// src/symbols/MotorIcon.js
import React from 'react';

export default function MotorIcon({ width = 32, height = 32 }) {
    return (
        <svg width={width} height={height} viewBox="0 0 60 60">
            {/* Main body */}
            <rect x="12" y="9" width="36" height="42" rx="12" fill="#ffe0b2" stroke="#bc6c25" strokeWidth="3" />
            {/* Shaft */}
            <rect x="46" y="25" width="9" height="10" rx="4" fill="#bc6c25" />
            {/* Terminal */}
            <circle cx="10" cy="30" r="5.4" fill="#bc6c25" stroke="#bc6c25" strokeWidth="2" />
            {/* "M" (zig-zag) */}
            <polyline
                points="20,35 23,25 26,35 29,25 32,35"
                fill="none"
                stroke="#bc6c25"
                strokeWidth="2"
            />
        </svg>
    );
}
