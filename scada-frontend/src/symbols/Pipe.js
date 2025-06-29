import React from 'react';

export default function PipeSVG({ width = 50, height = 16 }) {
    return (
        <svg width={width} height={height} viewBox="0 0 50 16" fill="none">
            <rect x="2" y="6" width="46" height="4" rx="2" fill="#888" stroke="#444" strokeWidth="1.5"/>
            <circle cx="4" cy="8" r="4" fill="#ccc" stroke="#444" strokeWidth="1"/>
            <circle cx="46" cy="8" r="4" fill="#ccc" stroke="#444" strokeWidth="1"/>
        </svg>
    );
}
