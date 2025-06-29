import React from 'react';

export default function TankIcon({ width = 32, height = 32 }) {
    return (
        <svg width={width} height={height} viewBox="0 0 70 90">
            <rect x="10" y="10" width="50" height="70" rx="15" fill="#aee" stroke="#228" strokeWidth="4"/>
            <rect x="23" y="80" width="24" height="8" rx="3" fill="#228" />
            <ellipse cx="35" cy="10" rx="25" ry="8" fill="#bff" stroke="#228" strokeWidth="3"/>
        </svg>
    );
}
