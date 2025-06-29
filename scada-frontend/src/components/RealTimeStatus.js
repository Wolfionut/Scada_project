// src/components/RealTimeStatus.js
import React from 'react';
import { Box, Chip, Typography, Tooltip } from '@mui/material';
import { Wifi, WifiOff, Circle, Speed } from '@mui/icons-material';
import { useRealTimeData } from '../hooks/useWebSocket';

export default function RealTimeStatus({ projectId }) {
    const { isConnected, measurements } = useRealTimeData(projectId);

    const measurementCount = Object.keys(measurements).length;
    const lastUpdate = Math.max(
        ...Object.values(measurements).map(m => new Date(m.timestamp).getTime())
    );

    return (
        <Box
            sx={{
                p: 2,
                borderRadius: 3,
                background: isConnected
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                color: 'white',
                textAlign: 'center'
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                {isConnected ? <Wifi fontSize="small" /> : <WifiOff fontSize="small" />}
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {isConnected ? 'Real-time Connected' : 'Disconnected'}
                </Typography>
            </Box>

            {isConnected && measurementCount > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <Circle
                        sx={{
                            fontSize: 8,
                            animation: 'pulse 2s infinite',
                            '@keyframes pulse': {
                                '0%, 100%': { opacity: 1 },
                                '50%': { opacity: 0.5 }
                            }
                        }}
                    />
                    <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                        {measurementCount} tags • {new Date(lastUpdate).toLocaleTimeString()}
                    </Typography>
                </Box>
            )}
        </Box>
    );
}