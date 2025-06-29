// src/symbols/ModernPump.js
import React from 'react';
import { Group, Circle, Rect, Path } from 'react-konva';

export default function ModernPump({
                                       id, x = 0, y = 0, width = 90, height = 70,
                                       selected, onClick, draggable, onDragEnd,
                                       active = true, status = 'online', speed = 0 // RPM indicator
                                   }) {
    const getStatusColors = () => {
        switch (status) {
            case 'online': return {
                primary: active ? '#1976D2' : '#42A5F5',
                secondary: active ? '#BBDEFB' : '#E3F2FD',
                accent: active ? '#0D47A1' : '#1565C0'
            };
            case 'warning': return {
                primary: '#F57C00',
                secondary: '#FFE0B2',
                accent: '#E65100'
            };
            case 'error': return {
                primary: '#D32F2F',
                secondary: '#FFCDD2',
                accent: '#B71C1C'
            };
            default: return {
                primary: '#757575',
                secondary: '#F5F5F5',
                accent: '#424242'
            };
        }
    };

    const colors = getStatusColors();

    return (
        <Group
            id={id}
            x={x}
            y={y}
            draggable={draggable}
            onClick={onClick}
            onTap={onClick}
            onDragEnd={onDragEnd}
        >
            {/* Pump Casing */}
            <Circle
                x={width/2}
                y={height/2}
                radius={Math.min(width, height)/2 - 8}
                fill={colors.secondary}
                stroke={colors.primary}
                strokeWidth={4}
            />

            {/* Impeller */}
            <Circle
                x={width/2}
                y={height/2}
                radius={Math.min(width, height)/3}
                fill={colors.primary}
                opacity={0.8}
            />

            {/* Inlet */}
            <Rect
                x={8}
                y={height/2 - 6}
                width={16}
                height={12}
                fill={colors.accent}
                cornerRadius={6}
            />

            {/* Outlet */}
            <Rect
                x={width - 24}
                y={height/2 - 8}
                width={20}
                height={16}
                fill={colors.accent}
                cornerRadius={8}
            />

            {/* Motor Housing */}
            <Rect
                x={width/2 - 10}
                y={8}
                width={20}
                height={15}
                fill={colors.primary}
                cornerRadius={4}
            />

            {/* Rotating Indicator (if active) */}
            {active && (
                <Path
                    data={`M ${width/2} ${height/2 - 8} L ${width/2 + 6} ${height/2} L ${width/2} ${height/2 + 8} L ${width/2 - 6} ${height/2} Z`}
                    fill="#FFD700"
                    rotation={speed * 6} // Visual rotation effect
                />
            )}

            {/* Status Indicator */}
            <Circle
                x={width - 12}
                y={12}
                radius={6}
                fill={active ? '#4CAF50' : '#F44336'}
                stroke="#FFF"
                strokeWidth={2}
            />

            {/* Flow Direction Arrow */}
            <Path
                data={`M ${width - 35} ${height/2} L ${width - 25} ${height/2 - 4} L ${width - 25} ${height/2 + 4} Z`}
                fill={active ? '#FFD700' : colors.accent}
            />

            {selected && (
                <Rect
                    x={-5}
                    y={-5}
                    width={width + 10}
                    height={height + 10}
                    stroke="#E040FB"
                    strokeWidth={3}
                    dash={[8, 4]}
                />
            )}
        </Group>
    );
}