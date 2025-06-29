// src/symbols/ModernPipe.js
import React from 'react';
import { Group, Line, Circle } from 'react-konva';

export default function ModernPipe({
                                       id, x = 0, y = 0, width = 100, height = 20,
                                       selected, onClick, draggable, onDragEnd,
                                       active = true, status = 'online', flowDirection = 'right' // 'left', 'right', 'none'
                                   }) {
    const getStatusColors = () => {
        switch (status) {
            case 'online': return {
                primary: active ? '#455A64' : '#607D8B',
                secondary: active ? '#B0BEC5' : '#CFD8DC',
                flow: active ? '#2196F3' : '#90CAF9'
            };
            case 'warning': return {
                primary: '#F57C00',
                secondary: '#FFB74D',
                flow: '#FFA726'
            };
            case 'error': return {
                primary: '#D32F2F',
                secondary: '#FFAB91',
                flow: '#F44336'
            };
            default: return {
                primary: '#757575',
                secondary: '#BDBDBD',
                flow: '#9E9E9E'
            };
        }
    };

    const colors = getStatusColors();
    const pipeThickness = Math.min(height, 16);

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
            {/* Main Pipe */}
            <Line
                points={[0, height/2, width, height/2]}
                stroke={colors.primary}
                strokeWidth={pipeThickness}
                lineCap="round"
            />

            {/* Inner Flow */}
            <Line
                points={[pipeThickness/2, height/2, width - pipeThickness/2, height/2]}
                stroke={colors.secondary}
                strokeWidth={pipeThickness - 4}
                lineCap="round"
            />

            {/* Flow Direction Indicators */}
            {active && flowDirection !== 'none' && (
                <>
                    {[0.25, 0.5, 0.75].map((pos, i) => {
                        const arrowX = width * pos;
                        const offset = flowDirection === 'right' ? 4 : -4;
                        return (
                            <Group key={i}>
                                <Line
                                    points={[arrowX, height/2, arrowX + offset, height/2 - 3]}
                                    stroke={colors.flow}
                                    strokeWidth={2}
                                    lineCap="round"
                                />
                                <Line
                                    points={[arrowX, height/2, arrowX + offset, height/2 + 3]}
                                    stroke={colors.flow}
                                    strokeWidth={2}
                                    lineCap="round"
                                />
                            </Group>
                        );
                    })}
                </>
            )}

            {/* Connection Points */}
            <Circle
                x={0}
                y={height/2}
                radius={pipeThickness/2 + 2}
                stroke={colors.primary}
                strokeWidth={2}
                fill={colors.secondary}
            />
            <Circle
                x={width}
                y={height/2}
                radius={pipeThickness/2 + 2}
                stroke={colors.primary}
                strokeWidth={2}
                fill={colors.secondary}
            />

            {selected && (
                <Line
                    points={[0, 0, width, 0, width, height, 0, height, 0, 0]}
                    stroke="#E040FB"
                    strokeWidth={2}
                    dash={[8, 4]}
                />
            )}
        </Group>
    );
}