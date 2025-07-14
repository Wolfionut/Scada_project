import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { useAlarmSound } from '../context/AlarmSoundContext';

export function AlarmSoundDebugger() {
    const {
        soundStatus,
        currentAlarm,
        volume,
        isEnabled
    } = useAlarmSound();

    return (
        <Paper sx={{
            position: 'fixed',
            bottom: 100,
            right: 20,
            p: 2,
            maxWidth: 300,
            zIndex: 1000,
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: 'white'
        }}>
            <Typography variant="h6">🔊 Alarm Sound Debug</Typography>
            <Typography variant="body2">Status: {soundStatus}</Typography>
            <Typography variant="body2">Enabled: {isEnabled ? 'Yes' : 'No'}</Typography>
            <Typography variant="body2">Volume: {Math.round(volume * 100)}%</Typography>
            <Typography variant="body2">
                Current: {currentAlarm?.rule_name || 'None'}
            </Typography>
        </Paper>
    );
}