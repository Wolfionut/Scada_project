import React from 'react';
import { Group, Ellipse, Rect, Line } from 'react-konva';

export default function Sensor({
                                   id,
                                   x = 0, y = 0, width = 48, height = 48,
                                   selected, onClick, draggable, onDragEnd
                               }) {
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
            {/* Body */}
            <Ellipse
                x={width / 2}
                y={height / 2}
                radiusX={width / 2.1}
                radiusY={height / 2.3}
                fill="#ffe7db"
                stroke="#c17623"
                strokeWidth={3.5}
            />
            {/* Side legs */}
            <Line
                points={[7, height / 2 + 3, 2, height / 2 + 3]}
                stroke="#c17623"
                strokeWidth={2.5}
            />
            <Line
                points={[width - 7, height / 2 + 3, width - 2, height / 2 + 3]}
                stroke="#c17623"
                strokeWidth={2.5}
            />
            {/* Top "ear" */}
            <Ellipse
                x={width / 2}
                y={7}
                radiusX={8}
                radiusY={4}
                fill="#c17623"
                opacity={0.48}
            />
            {/* "M" symbol */}
            <Line
                points={[
                    width / 2 - 6, height / 2 - 1,
                    width / 2 - 2, height / 2 + 6,
                    width / 2 + 2, height / 2 - 1,
                    width / 2 + 6, height / 2 + 6
                ]}
                stroke="#c17623"
                strokeWidth={2.1}
                lineJoin="round"
            />
            {selected && (
                <Rect
                    x={-4}
                    y={-4}
                    width={width + 8}
                    height={height + 8}
                    stroke="#E040FB"
                    strokeWidth={3}
                    dash={[6, 4]}
                />
            )}
        </Group>
    );
}
