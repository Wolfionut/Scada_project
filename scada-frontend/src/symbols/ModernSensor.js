// src/symbols/ModernSensor.js
import React from 'react';
import { Group, Circle, Rect, Path, Line } from 'react-konva';

export default function ModernSensor({
                                         id, x = 0, y = 0, width = 60, height = 60,
                                         selected, onClick, draggable, onDragEnd,
                                         active = true, status = 'online', sensorType = 'temperature' // 'temperature', 'pressure', 'flow', 'level'
                                     }) {
    const getStatusColors = () => {
        switch (status) {
            case 'online': return {
                primary: active ? '#FF6F00' : '#FFB300',
                secondary: active ? '#FFF3E0' : '#FFF8E1',
                accent: active ? '#E65100' : '#F57C00'
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

    const getSensorIcon = () => {
        switch (sensorType) {
            case 'temperature':
                return (
                    <Path
                        data={`M ${width/2} ${height/2 - 8} L ${width/2} ${height/2 + 4} M ${width/2 - 4} ${height/2 + 4} L ${width/2 + 4} ${height/2 + 4}`}
                        stroke={colors.accent}
                        strokeWidth={3}
                        lineCap="round"
                    />
                );
            case 'pressure':
                return (
                    <Circle
                        x={width/2}
                        y={height/2}
                        radius={6}
                        fill="none"
                        stroke={colors.accent}
                        strokeWidth={2}
                    />
                );
            case 'flow':
                return (
                    <Path
                        data={`M ${width/2 - 6} ${height/2} L ${width/2 + 6} ${height/2} M ${width/2 + 2} ${height/2 - 3} L ${width/2 + 6} ${height/2} L ${width/2 + 2} ${height/2 + 3}`}
                        stroke={colors.accent}
                        strokeWidth={2}
                        lineCap="round"
                    />
                );
            default:
                return (
                    <Path
                        data={`M ${width/2 - 4} ${height/2 - 4} L ${width/2 + 4} ${height/2 + 4} M ${width/2 + 4} ${height/2 - 4} L ${width/2 - 4} ${height/2 + 4}`}
                        stroke={colors.accent}
                        strokeWidth={2}
                        lineCap="round"
                    />
                );
        }
    };

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
            {/* Sensor Housing */}
            <Circle
                x={width/2}
                y={height/2}
                radius={width/2 - 5}
                fill={colors.secondary}
                stroke={colors.primary}
                strokeWidth={3}
            />

            {/* Mounting Thread */}
            <Circle
                x={width/2}
                y={height/2}
                radius={width/2 - 10}
                fill="none"
                stroke={colors.accent}
                strokeWidth={1}
                dash={[2, 2]}
            />

            {/* Cable/Conduit */}
            <Rect
                x={width/2 - 3}
                y={2}
                width={6}
                height={12}
                fill={colors.primary}
                cornerRadius={3}
            />

            {/* Sensing Element */}
            <Circle
                x={width/2}
                y={height - 8}
                radius={4}
                fill={colors.accent}
            />

            {/* Sensor Type Icon */}
            {getSensorIcon()}

            {/* Signal Indicator (if active) */}
            {active && (
                <Path
                    data={`M ${width/2 - 8} ${height/2 - 12} Q ${width/2} ${height/2 - 16} ${width/2 + 8} ${height/2 - 12}`}
                    stroke="#4CAF50"
                    strokeWidth={2}
                    fill="none"
                    dash={[3, 3]}
                />
            )}

            {/* Status LED */}
            <Circle
                x={width - 8}
                y={8}
                radius={4}
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