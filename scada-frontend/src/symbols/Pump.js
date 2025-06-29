import React from 'react';
import { Group, Ellipse, Rect } from 'react-konva';

export default function Pump({
                                 id, x=0, y=0, width=70, height=50,
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
            <Ellipse
                x={width/2}
                y={height/2}
                radiusX={width/2 - 6}
                radiusY={height/2 - 12}
                fill="#ccf6ff"
                stroke="#2c4a7a"
                strokeWidth={3}
            />
            <Rect
                x={width-15}
                y={height/2-7}
                width={10}
                height={14}
                fill="#2c4a7a"
                cornerRadius={3}
            />
            <Rect
                x={width-6}
                y={height/2-2}
                width={9}
                height={4}
                fill="#2991c9"
                cornerRadius={2}
            />
            {selected && (
                <Rect
                    x={-5}
                    y={-5}
                    width={width+10}
                    height={height+10}
                    stroke="#E040FB"
                    strokeWidth={3}
                    dash={[6, 4]}
                />
            )}
        </Group>
    );
}
