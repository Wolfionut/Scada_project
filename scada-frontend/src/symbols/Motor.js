import React from 'react';
import { Group, Ellipse, Rect, Line } from 'react-konva';

export default function Motor({
                                  id,
                                  x = 0, y = 0, width = 60, height = 60,
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
                radiusX={width / 2.4}
                radiusY={height / 2.5}
                fill="#fff2d6"
                stroke="#ad681d"
                strokeWidth={4}
            />
            {/* "M" symbol */}
            <Line
                points={[
                    width / 2 - 11, height / 2 + 8,
                    width / 2 - 7, height / 2 - 7,
                    width / 2, height / 2 + 8,
                    width / 2 + 7, height / 2 - 7,
                    width / 2 + 11, height / 2 + 8
                ]}
                stroke="#ad681d"
                strokeWidth={2.6}
                lineJoin="round"
            />
            {/* Pins */}
            <Ellipse
                x={width / 2}
                y={height - 7}
                radiusX={8}
                radiusY={3}
                fill="#ad681d"
                opacity={0.48}
            />
            {selected && (
                <Rect
                    x={-5}
                    y={-5}
                    width={width + 10}
                    height={height + 10}
                    stroke="#E040FB"
                    strokeWidth={3}
                    dash={[6, 4]}
                />
            )}
        </Group>
    );
}
