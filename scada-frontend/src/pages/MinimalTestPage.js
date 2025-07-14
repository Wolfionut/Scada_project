// src/pages/MinimalTestPage.js - Minimal test page for alarm sound system
import React, { useState } from 'react';
import {
    Box, Button, Typography, Paper, Stack, Chip, Alert,
    FormControlLabel, Switch, Slider
} from '@mui/material';
import {
    VolumeUp as VolumeUpIcon,
    VolumeOff as VolumeOffIcon,
    PlayArrow as PlayArrowIcon,
    Stop as StopIcon,
    Warning as WarningIcon,
    Error as ErrorIcon,
    Info as InfoIcon
} from '@mui/icons-material';
import { useAlarmSound } from '../context/AlarmSoundContext';
import { useTheme } from '../context/ThemeContext';

export default function MinimalTestPage() {
    const { isDark } = useTheme();
    const {
        isEnabled,
        masterVolume,
        currentAlarm,
        soundStatus,
        playAlarmSequence,
        playTestSound,
        stopAlarm,
        toggleSounds,
        setVolume
    } = useAlarmSound();

    const [testResults, setTestResults] = useState([]);

    const addTestResult = (test, success, message) => {
        const result = {
            test,
            success,
            message,
            timestamp: new Date().toLocaleTimeString()
        };
        setTestResults(prev => [result, ...prev.slice(0, 4)]);
    };

    const testAlarmSound = async (severity) => {
        try {
            console.log(`🧪 Testing ${severity} alarm sound...`);
            await playAlarmSequence(severity, {
                rule_name: `${severity.toUpperCase()} Test Alarm`,
                tag_name: 'Test Tag',
                device_name: 'Test Device',
                manual_test: true
            });
            addTestResult(`${severity} Sound`, true, 'Sound triggered successfully');
        } catch (error) {
            addTestResult(`${severity} Sound`, false, `Error: ${error.message}`);
        }
    };

    const testStopSound = () => {
        try {
            console.log('🧪 Testing stop sound...');
            stopAlarm();
            addTestResult('Stop Sound', true, 'Stop command sent');
        } catch (error) {
            addTestResult('Stop Sound', false, `Error: ${error.message}`);
        }
    };

    return (
        <Box sx={{
            p: 4,
            background: isDark
                ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
                : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            minHeight: '100vh'
        }}>
            <Typography variant="h3" sx={{ mb: 4, fontWeight: 800 }}>
                🔊 Alarm Sound System Test
            </Typography>

            <Paper sx={{ p: 4, mb: 3 }}>
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
                    System Status
                </Typography>

                <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                    <Chip
                        icon={isEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
                        label={isEnabled ? 'Sounds Enabled' : 'Sounds Disabled'}
                        color={isEnabled ? 'success' : 'error'}
                    />
                    <Chip
                        label={`Volume: ${Math.round(masterVolume * 100)}%`}
                        color="info"
                    />
                    <Chip
                        label={`Status: ${soundStatus || 'idle'}`}
                        color={soundStatus === 'playing' ? 'warning' : 'default'}
                    />
                    {currentAlarm && (
                        <Chip
                            label={`Playing: ${currentAlarm.rule_name}`}
                            color="error"
                        />
                    )}
                </Stack>

                <FormControlLabel
                    control={
                        <Switch
                            checked={isEnabled}
                            onChange={toggleSounds}
                            color="primary"
                        />
                    }
                    label="Enable Alarm Sounds"
                />

                {isEnabled && (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                            Master Volume: {Math.round(masterVolume * 100)}%
                        </Typography>
                        <Slider
                            value={masterVolume}
                            onChange={(e, value) => setVolume(value)}
                            min={0}
                            max={1}
                            step={0.1}
                            sx={{ width: 300 }}
                        />
                    </Box>
                )}
            </Paper>

            <Paper sx={{ p: 4, mb: 3 }}>
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
                    Test Controls
                </Typography>

                <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                    <Button
                        variant="contained"
                        color="warning"
                        startIcon={<WarningIcon />}
                        onClick={() => testAlarmSound('warning')}
                        disabled={!isEnabled}
                    >
                        Test Warning
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        startIcon={<ErrorIcon />}
                        onClick={() => testAlarmSound('critical')}
                        disabled={!isEnabled}
                    >
                        Test Critical
                    </Button>
                    <Button
                        variant="contained"
                        color="info"
                        startIcon={<InfoIcon />}
                        onClick={() => testAlarmSound('info')}
                        disabled={!isEnabled}
                    >
                        Test Info
                    </Button>
                    <Button
                        variant="outlined"
                        color="secondary"
                        startIcon={<StopIcon />}
                        onClick={testStopSound}
                    >
                        Stop Sound
                    </Button>
                </Stack>

                {!isEnabled && (
                    <Alert severity="warning">
                        Enable sounds first to test alarm sounds
                    </Alert>
                )}
            </Paper>

            {testResults.length > 0 && (
                <Paper sx={{ p: 4 }}>
                    <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
                        Test Results
                    </Typography>
                    {testResults.map((result, index) => (
                        <Alert
                            key={index}
                            severity={result.success ? 'success' : 'error'}
                            sx={{ mb: 1 }}
                        >
                            <Typography variant="body2">
                                <strong>{result.test}</strong> - {result.message}
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                {result.timestamp}
                            </Typography>
                        </Alert>
                    ))}
                </Paper>
            )}
        </Box>
    );
}