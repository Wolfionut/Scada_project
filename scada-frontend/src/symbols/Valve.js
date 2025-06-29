import React from 'react';
import { Group, Rect, Line } from 'react-konva';

export default function Valve({
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
            {/* Valve body */}
            <Rect
                x={8}
                y={18}
                width={width - 16}
                height={height - 36}
                fill="#fff4c0"
                stroke="#a38200"
                strokeWidth={4}
                cornerRadius={12}
            />
            {/* Stem */}
            <Line
                points={[width / 2, 5, width / 2, 18]}
                stroke="#a38200"
                strokeWidth={4}
            />
            {/* Pipe left/right */}
            <Line
                points={[0, height / 2, 8, height / 2]}
                stroke="#a38200"
                strokeWidth={5}
            />
            <Line
                points={[width - 8, height / 2, width, height / 2]}
                stroke="#a38200"
                strokeWidth={5}
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
