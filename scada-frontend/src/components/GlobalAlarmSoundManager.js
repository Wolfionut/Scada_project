// src/components/GlobalAlarmSoundManager.js - FIXED IMPORTS
import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Box, Fade, Alert, IconButton, Button, Typography, Chip } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useRealTimeData } from '../hooks/useWebSocket';
import { useAlarmSoundEffects } from '../hooks/useAlarmSoundEffects';
import { AlarmSoundControls } from './AlarmSoundControls'; // FIXED: Import from correct location
import { useTheme } from '../context/ThemeContext';

export function GlobalAlarmSoundManager() {
    const location = useLocation();
    const params = useParams();
    const { isDark } = useTheme();

    // Only activate for project pages
    const projectId = params.projectId;
    const isProjectPage = location.pathname.includes('/project/') && projectId;

    // Get real-time alarm data only for project pages
    const {
        activeAlarms = [],
        alarmEvents = [],
        isConnected = false
    } = useRealTimeData(isProjectPage ? projectId : null);

    // Enable automatic sound triggering
    useAlarmSoundEffects(activeAlarms, alarmEvents);

    // Don't render anything on non-project pages
    if (!isProjectPage) return null;

    return (
        <>
            {/* Global sound controls - only on project pages */}
            <Box sx={{
                position: 'fixed',
                top: 20,
                right: 20,
                zIndex: 9999,
                background: isDark
                    ? 'rgba(30, 41, 59, 0.95)'
                    : 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: 3,
                p: 1,
                boxShadow: isDark
                    ? '0 8px 32px rgba(0, 0, 0, 0.3)'
                    : '0 8px 32px rgba(0, 0, 0, 0.1)',
                border: isDark
                    ? '1px solid rgba(71, 85, 105, 0.3)'
                    : '1px solid rgba(226, 232, 240, 0.3)'
            }}>
                <AlarmSoundControls variant="compact" />
            </Box>

            {/* Global alarm notification banner */}
            <GlobalAlarmBanner
                activeAlarms={activeAlarms}
                isConnected={isConnected}
                projectId={projectId}
                isDark={isDark}
            />
        </>
    );
}

function GlobalAlarmBanner({ activeAlarms, isConnected, projectId, isDark }) {
    const [dismissed, setDismissed] = React.useState(false);
    const location = useLocation();

    // Reset dismissed state when alarms change
    React.useEffect(() => {
        if (activeAlarms?.length > 0) {
            setDismissed(false);
        }
    }, [activeAlarms]);

    // Don't show banner on alarms page itself
    const isAlarmsPage = location.pathname.includes('/alarms');
    const hasActiveAlarms = activeAlarms?.length > 0;
    const criticalAlarms = activeAlarms?.filter(a => a.severity === 'critical') || [];

    if (!hasActiveAlarms || dismissed || isAlarmsPage) return null;

    return (
        <Fade in={hasActiveAlarms && !dismissed}>
            <Box sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 9998,
                background: criticalAlarms.length > 0
                    ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
                    : 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                color: 'white',
                p: 2,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                animation: criticalAlarms.length > 0 ? 'pulse 2s infinite' : 'none'
            }}>
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    maxWidth: 1200,
                    mx: 'auto'
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            🚨 {activeAlarms.length} Active Alarm{activeAlarms.length > 1 ? 's' : ''}
                        </Typography>
                        {criticalAlarms.length > 0 && (
                            <Chip
                                label={`${criticalAlarms.length} CRITICAL`}
                                sx={{
                                    background: 'rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                    fontWeight: 700
                                }}
                            />
                        )}
                        {!isConnected && (
                            <Chip
                                label="OFFLINE"
                                sx={{
                                    background: 'rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                    fontWeight: 700
                                }}
                            />
                        )}

                        {/* Show first few alarm names */}
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {activeAlarms.slice(0, 2).map((alarm, index) => (
                                <Typography
                                    key={index}
                                    variant="body2"
                                    sx={{
                                        opacity: 0.9,
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        px: 1,
                                        py: 0.5,
                                        borderRadius: 1,
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    {alarm.rule_name}
                                </Typography>
                            ))}
                            {activeAlarms.length > 2 && (
                                <Typography
                                    variant="body2"
                                    sx={{ opacity: 0.8, fontStyle: 'italic' }}
                                >
                                    +{activeAlarms.length - 2} more
                                </Typography>
                            )}
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Button
                            variant="contained"
                            size="small"
                            sx={{
                                background: 'rgba(255, 255, 255, 0.2)',
                                color: 'white',
                                '&:hover': {
                                    background: 'rgba(255, 255, 255, 0.3)'
                                }
                            }}
                            onClick={() => {
                                // Navigate to alarms page within current project
                                window.location.href = `/project/${projectId}/alarms`;
                            }}
                        >
                            View Alarms
                        </Button>
                        <IconButton
                            size="small"
                            onClick={() => setDismissed(true)}
                            sx={{ color: 'white' }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </Box>
            </Box>
        </Fade>
    );
}

// CSS animations for the banner
const styles = `
@keyframes pulse {
    0% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.9; transform: scale(1.01); }
    100% { opacity: 1; transform: scale(1); }
}
`;

// Inject styles into document head
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}