// src/pages/DataTable.js
import React from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, Paper, Chip, Typography
} from '@mui/material';

export default function DataTable({ tableData }) {
    return (
        <TableContainer component={Paper}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Timestamp</TableCell>
                        <TableCell>Tag Name</TableCell>
                        <TableCell>Device Name</TableCell>
                        <TableCell align="right">Value</TableCell>
                        <TableCell>Unit</TableCell>
                        <TableCell>Quality</TableCell>
                        <TableCell>Source</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {tableData.map((row) => (
                        <TableRow key={row.id}>
                            <TableCell>{row.timestamp}</TableCell>
                            <TableCell>{row.tag_name}</TableCell>
                            <TableCell>{row.device_name}</TableCell>
                            <TableCell align="right">{row.value}</TableCell>
                            <TableCell>{row.unit}</TableCell>
                            <TableCell>
                                <Chip label={row.quality} size="small" color={row.quality === 'good' ? 'success' : 'warning'} />
                            </TableCell>
                            <TableCell>
                                <Typography variant="caption">{row.source}</Typography>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
