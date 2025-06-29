import React from "react";

export default function PumpIcon({ width = 28, height = 28 }) {
    return (
        <svg width={width} height={height} viewBox="0 0 28 28">
            <ellipse cx="14" cy="14" rx="12" ry="8" fill="#ccf6ff" stroke="#2c4a7a" strokeWidth="3"/>
            <rect x="21" y="11" width="4" height="6" fill="#2c4a7a" rx="2"/>
            <rect x="25" y="13" width="5" height="2" fill="#2991c9"/>
        </svg>
    );
}
