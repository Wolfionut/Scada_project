import React from 'react';

export default function ValveIcon({ width = 32, height = 32 }) {
    return (
        <svg width={width} height={height} viewBox="0 0 60 60">
            <polygon
                points="30,0 60,30 30,60 0,30"
                fill="#fff9c4"
                stroke="#fbc02d"
                strokeWidth="4"
            />
            <rect x="25" y="10" width="10" height="15" rx="2" fill="#fbc02d" />
        </svg>
    );
}
