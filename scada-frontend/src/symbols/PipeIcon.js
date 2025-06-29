// src/symbols/PipeIcon.js
import React from 'react';
export default function PipeIcon({ width = 32, height = 16 }) {
    return (
        <svg width={width} height={height} viewBox="0 0 32 16">
            <rect x="0" y="4" width="32" height="8" rx="4" fill="#B0BEC5" stroke="#333" strokeWidth="2" />
        </svg>
    );
}
