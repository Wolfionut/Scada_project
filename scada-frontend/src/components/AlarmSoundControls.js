// src/components/AlarmSoundControls.js - Sound Control Component
import React from 'react';
import {
    Box, IconButton, Tooltip, Slider, Paper, Typography, Button,
    Chip, Dialog, DialogTitle, DialogContent, DialogActions,
    Stack, Divider, Switch, FormControlLabel, Alert
} from '@mui/material';
import {
    VolumeUp as VolumeUpIcon,
    VolumeOff as VolumeOffIcon,
    VolumeDown as VolumeDownIcon,
    PlayArrow as PlayArrowIcon,
    Stop as StopIcon,
    Settings as SettingsIcon,
    NotificationsActive as NotificationsActiveIcon,
    PlayCircle as TestIcon
} from '@mui/icons-material';
import { useAlarmSound } from '../context/AlarmSoundContext';

export function AlarmSoundControls({ variant = 'compact' }) {
    const {
        isEnabled,
        masterVolume,
        currentAlarm,
        soundStatus,
        playTestSound,
        stopAlarm,
        toggleSounds,
        setVolume
    } = useAlarmSound();

    const [settingsOpen, setSettingsOpen] = React.useState(false);

    if (variant === 'compact') {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Tooltip title={isEnabled ? 'Alarm sounds enabled' : 'Alarm sounds disabled'}>
                    <IconButton
                        onClick={toggleSounds}
                        color={isEnabled ? 'primary' : 'default'}
                        sx={{
                            bgcolor: isEnabled ? 'primary.50' : 'grey.100',
                            '&:hover': {
                                bgcolor: isEnabled ? 'primary.100' : 'grey.200'
                            }
                        }}
                    >
                        {isEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
                    </IconButton>
                </Tooltip>

                {currentAlarm && soundStatus === 'playing' && (
                    <Chip
                        icon={<NotificationsActiveIcon />}
                        label={`🔊 ${currentAlarm.rule_name || 'Alarm'}`}
                        color="error"
                        size="small"
                        sx={{
                            fontWeight: 600,
                            animation: 'pulse 2s infinite'
                        }}
                        onDelete={stopAlarm}
                        deleteIcon={<StopIcon />}
                    />
                )}

                <IconButton
                    size="small"
                    onClick={() => setSettingsOpen(true)}
                    sx={{ opacity: 0.7 }}
                >
                    <SettingsIcon fontSize="small" />
                </IconButton>

                <AlarmSoundSettingsDialog
                    open={settingsOpen}
                    onClose={() => setSettingsOpen(false)}
                />
            </Box>
        );
    }

    return (
        <Paper sx={{ p: 3, background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                🔊 Alarm Sound Settings
            </Typography>

            <Stack spacing={3}>
                <FormControlLabel
                    control={
                        <Switch
                            checked={isEnabled}
                            onChange={toggleSounds}
                            color="primary"
                        />
                    }
                    label={
                        <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                Enable Alarm Sounds
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Play audio alerts when alarms are triggered
                            </Typography>
                        </Box>
                    }
                />

                {isEnabled && (
                    <>
                        <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                Master Volume: {Math.round(masterVolume * 100)}%
                            </Typography>
                            <Slider
                                value={masterVolume}
                                onChange={(e, value) => setVolume(value)}
                                min={0}
                                max={1}
                                step={0.1}
                                sx={{ width: 200 }}
                            />
                        </Box>

                        <Divider />

                        <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 2 }}>
                                Test Alarm Sounds
                            </Typography>
                            <Stack direction="row" spacing={2}>
                                <Button
                                    variant="outlined"
                                    color="info"
                                    startIcon={<TestIcon />}
                                    onClick={() => playTestSound('info')}
                                    size="small"
                                >
                                    Info
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="warning"
                                    startIcon={<TestIcon />}
                                    onClick={() => playTestSound('warning')}
                                    size="small"
                                >
                                    Warning
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="error"
                                    startIcon={<TestIcon />}
                                    onClick={() => playTestSound('critical')}
                                    size="small"
                                >
                                    Critical
                                </Button>
                            </Stack>
                        </Box>

                        {currentAlarm && (
                            <>
                                <Divider />
                                <Alert severity="warning" sx={{ fontWeight: 600 }}>
                                    🔊 Currently playing: {currentAlarm.rule_name}
                                    <Button
                                        size="small"
                                        onClick={stopAlarm}
                                        sx={{ ml: 2 }}
                                    >
                                        Stop
                                    </Button>
                                </Alert>
                            </>
                        )}
                    </>
                )}
            </Stack>
        </Paper>
    );
}

function AlarmSoundSettingsDialog({ open, onClose }) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>🔊 Alarm Sound Settings</DialogTitle>
            <DialogContent>
                <AlarmSoundControls variant="full" />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}