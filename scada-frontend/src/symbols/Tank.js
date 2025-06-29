import React from 'react';
import { Group, Rect, Ellipse } from 'react-konva';

export default function Tank({
                                 id, // important!
                                 x = 0, y = 0, width = 70, height = 90,
                                 selected, onClick, draggable, onDragEnd
                             }) {
    return (
        <Group
            id={id}    // pass this in DiagramEditorPage!
            x={x}
            y={y}
            draggable={draggable}
            onClick={onClick}
            onTap={onClick}
            onDragEnd={onDragEnd}
        >
            <Rect
                x={0}
                y={10}
                width={width}
                height={height - 20}
                fill="#aee"
                stroke="#228"
                strokeWidth={4}
                cornerRadius={15}
            />
            <Rect
                x={width / 3}
                y={height - 10}
                width={width / 3}
                height={8}
                fill="#228"
                cornerRadius={3}
            />
            <Ellipse
                x={width / 2}
                y={10}
                radiusX={width / 2 - 5}
                radiusY={8}
                fill="#bff"
                stroke="#228"
                strokeWidth={3}
            />
            {selected && (
                <Rect
                    x={-5}
                    y={5}
                    width={width + 10}
                    height={height}
                    stroke="#E040FB"
                    strokeWidth={3}
                    dash={[6, 4]}
                />
            )}
        </Group>
    );
}