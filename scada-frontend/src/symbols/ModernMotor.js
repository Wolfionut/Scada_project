// src/symbols/ModernMotor.js
import React from 'react';
import { Group, Circle, Rect, Path, Line } from 'react-konva';

export default function ModernMotor({
                                        id, x = 0, y = 0, width = 80, height = 70,
                                        selected, onClick, draggable, onDragEnd,
                                        active = true, status = 'online', rpm = 1450 // Motor speed
                                    }) {
    const getStatusColors = () => {
        switch (status) {
            case 'online': return {
                primary: active ? '#1976D2' : '#42A5F5',
                secondary: active ? '#E3F2FD' : '#F3F9FF',
                accent: active ? '#0D47A1' : '#1565C0'
            };
            case 'warning': return {
                primary: '#F57C00',
                secondary: '#FFF3E0',
                accent: '#E65100'
            };
            case 'error': return {
                primary: '#D32F2F',
                secondary: '#FFEBEE',
                accent: '#B71C1C'
            };
            default: return {
                primary: '#757575',
                secondary: '#FAFAFA',
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
            {/* Motor Frame */}
            <Rect
                x={8}
                y={15}
                width={width - 16}
                height={height - 30}
                fill={colors.secondary}
                stroke={colors.primary}
                strokeWidth={3}
                cornerRadius={8}
            />

            {/* Stator */}
            <Circle
                x={width/2}
                y={height/2}
                radius={Math.min(width, height)/3}
                fill={colors.primary}
                opacity={0.7}
            />

            {/* Rotor */}
            <Circle
                x={width/2}
                y={height/2}
                radius={Math.min(width, height)/4}
                fill={colors.accent}
            />

            {/* Shaft Extension */}
            <Rect
                x={width - 8}
                y={height/2 - 4}
                width={16}
                height={8}
                fill={colors.accent}
                cornerRadius={4}
            />

            {/* Terminal Box */}
            <Rect
                x={width/2 - 8}
                y={5}
                width={16}
                height={10}
                fill={colors.primary}
                cornerRadius={2}
            />

            {/* Cooling Fins */}
            {[0, 1, 2, 3].map(i => (
                <Line
                    key={i}
                    points={[12 + i * 12, height - 15, 12 + i * 12, height - 5]}
                    stroke={colors.accent}
                    strokeWidth={2}
                />
            ))}

            {/* Nameplate */}
            <Rect
                x={15}
                y={height/2 - 8}
                width={20}
                height={16}
                fill="#FFF"
                stroke={colors.primary}
                strokeWidth={1}
                cornerRadius={2}
            />

            {/* Motor Rating "M" */}
            <Path
                data={`M 20 ${height/2 - 4} L 22 ${height/2 + 4} L 25 ${height/2 - 2} L 28 ${height/2 + 4} L 30 ${height/2 - 4}`}
                stroke={colors.primary}
                strokeWidth={2}
                fill="none"
            />

            {/* Rotation Indicator (if active) */}
            {active && (
                <Circle
                    x={width/2}
                    y={height/2}
                    radius={3}
                    fill="#FFD700"
                />
            )}

            {/* Status Indicator */}
            <Circle
                x={width - 10}
                y={10}
                radius={6}
                fill={active ? '#4CAF50' : '#F44336'}
                stroke="#FFF"
                strokeWidth={2}
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