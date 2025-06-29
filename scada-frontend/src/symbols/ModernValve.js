// src/symbols/ModernValve.js
import React from 'react';
import { Group, Rect, Path, Circle, Line } from 'react-konva';

export default function ModernValve({
                                        id, x = 0, y = 0, width = 70, height = 70,
                                        selected, onClick, draggable, onDragEnd,
                                        active = true, status = 'online', position = 100 // 0-100% open
                                    }) {
    const getStatusColors = () => {
        switch (status) {
            case 'online': return {
                primary: active ? '#388E3C' : '#66BB6A',
                secondary: active ? '#C8E6C9' : '#E8F5E8',
                accent: active ? '#1B5E20' : '#2E7D32'
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
    const stemRotation = (position / 100) * 90; // 0-90 degrees

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
            {/* Valve Body */}
            <Path
                data={`M ${width/2} 20 L ${width - 15} ${height/2} L ${width/2} ${height - 20} L 15 ${height/2} Z`}
                fill={colors.secondary}
                stroke={colors.primary}
                strokeWidth={3}
            />

            {/* Inlet Pipe */}
            <Rect
                x={0}
                y={height/2 - 6}
                width={15}
                height={12}
                fill={colors.accent}
                cornerRadius={6}
            />

            {/* Outlet Pipe */}
            <Rect
                x={width - 15}
                y={height/2 - 6}
                width={15}
                height={12}
                fill={colors.accent}
                cornerRadius={6}
            />

            {/* Valve Stem */}
            <Rect
                x={width/2 - 3}
                y={5}
                width={6}
                height={15}
                fill={colors.primary}
                cornerRadius={3}
            />

            {/* Actuator */}
            <Circle
                x={width/2}
                y={8}
                radius={12}
                fill={colors.primary}
                stroke={colors.accent}
                strokeWidth={2}
            />

            {/* Position Indicator */}
            <Line
                points={[width/2, 8, width/2 + 8 * Math.cos((stemRotation - 90) * Math.PI / 180), 8 + 8 * Math.sin((stemRotation - 90) * Math.PI / 180)]}
                stroke="#FFD700"
                strokeWidth={3}
                lineCap="round"
            />

            {/* Internal Gate/Disc */}
            <Path
                data={`M ${width/2 - 8} ${height/2} L ${width/2 + 8} ${height/2}`}
                stroke={position > 80 ? '#4CAF50' : position > 20 ? '#FFC107' : '#F44336'}
                strokeWidth={4}
                opacity={0.8}
            />

            {/* Flow Indicator */}
            {position > 10 && (
                <Path
                    data={`M ${width/2 - 25} ${height/2} L ${width/2 - 15} ${height/2 - 3} L ${width/2 - 15} ${height/2 + 3} Z`}
                    fill={active ? '#2196F3' : colors.accent}
                />
            )}

            {/* Status Indicator */}
            <Circle
                x={width - 10}
                y={15}
                radius={5}
                fill={active ? '#4CAF50' : '#F44336'}
                stroke="#FFF"
                strokeWidth={1}
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