// src/symbols/ModernTank.js
import React from 'react';
import { Group, Rect, Path, Circle } from 'react-konva';

export default function ModernTank({
                                       id, x = 0, y = 0, width = 80, height = 100,
                                       selected, onClick, draggable, onDragEnd,
                                       active = true, status = 'online', fillLevel = 75 // 0-100%
                                   }) {
    const getStatusColors = () => {
        switch (status) {
            case 'online': return {
                primary: active ? '#2E7D32' : '#4CAF50',
                secondary: active ? '#A5D6A7' : '#C8E6C9',
                fill: active ? '#1976D2' : '#90CAF9'
            };
            case 'warning': return {
                primary: '#F57C00',
                secondary: '#FFB74D',
                fill: '#FFA726'
            };
            case 'error': return {
                primary: '#D32F2F',
                secondary: '#FFAB91',
                fill: '#F44336'
            };
            default: return {
                primary: '#757575',
                secondary: '#BDBDBD',
                fill: '#9E9E9E'
            };
        }
    };

    const colors = getStatusColors();
    const liquidHeight = (height - 30) * (fillLevel / 100);

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
            {/* Tank Body */}
            <Rect
                x={5}
                y={15}
                width={width - 10}
                height={height - 30}
                fill={colors.secondary}
                stroke={colors.primary}
                strokeWidth={3}
                cornerRadius={8}
            />

            {/* Liquid Fill */}
            <Rect
                x={8}
                y={height - 15 - liquidHeight}
                width={width - 16}
                height={liquidHeight}
                fill={colors.fill}
                opacity={0.8}
                cornerRadius={5}
            />

            {/* Tank Top */}
            <Path
                data={`M 5 15 Q ${width/2} 5 ${width-5} 15 L ${width-5} 25 Q ${width/2} 15 5 25 Z`}
                fill={colors.primary}
                opacity={0.9}
            />

            {/* Bottom Outlet */}
            <Rect
                x={width/2 - 8}
                y={height - 15}
                width={16}
                height={12}
                fill={colors.primary}
                cornerRadius={4}
            />

            {/* Level Indicator Lines */}
            {[25, 50, 75].map(level => (
                <Rect
                    key={level}
                    x={width - 2}
                    y={height - 15 - ((height - 30) * level / 100)}
                    width={8}
                    height={1}
                    fill={colors.primary}
                />
            ))}

            {/* Status Indicator */}
            <Circle
                x={width - 12}
                y={25}
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