// src/components/GlobalAlarmSoundManager.js - FIXED VERSION
import React, { useEffect, useMemo } from 'react';
import { useRealTimeData } from '../hooks/useWebSocket';
import { useAlarmSound } from '../context/AlarmSoundContext';

export function GlobalAlarmSoundManager({ projectId }) {
    // WebSocket real-time data
    const {
        isConnected,
        activeAlarms: wsActiveAlarms = [],
        alarmSummary: wsAlarmSummary = {},
        alarmEvents: wsAlarmEvents = []
    } = useRealTimeData(projectId);

    // Alarm sound integration
    const {
        playAlarmSequence,
        stopAlarm,
        isEnabled: soundEnabled,
        currentAlarm,
        soundStatus
    } = useAlarmSound();

    // 🔧 FIXED ALARM FILTERING LOGIC - Using useMemo instead of useCallback
    const currentActiveAlarms = useMemo(() => {
        const alarms = wsActiveAlarms || [];

        console.log('🔧 [GlobalAlarmSoundManager] Filtering alarms:', {
            ws_count: wsActiveAlarms?.length || 0,
            using_source: 'WebSocket',
            ws_summary: wsAlarmSummary
        });

        if (!alarms || alarms.length === 0) {
            console.log('🔧 [GlobalAlarmSoundManager] No alarms to filter');
            return [];
        }

        const filtered = alarms.filter(alarm => {
            if (!alarm) {
                console.log('🔧 [GlobalAlarmSoundManager] Skipping null alarm');
                return false;
            }

            // Enhanced filtering - More robust acknowledgment detection
            const hasAcknowledgment = !!(
                alarm.acknowledged_at ||
                alarm.acknowledged_by ||
                alarm.ack_time ||
                alarm.ack_message ||
                (alarm.state && alarm.state.toLowerCase() === 'acknowledged') ||
                (alarm.current_state && alarm.current_state.toLowerCase() === 'acknowledged') ||
                (alarm.status && alarm.status.toLowerCase() === 'acknowledged')
            );

            const isTriggeredState = (
                alarm.state === 'triggered' ||
                alarm.current_state === 'triggered' ||
                alarm.status === 'triggered' ||
                (alarm.trigger_value !== null && alarm.trigger_value !== undefined && !hasAcknowledgment)
            );

            const isEnabled = alarm.enabled !== false;
            const isActive = isTriggeredState && !hasAcknowledgment && isEnabled;

            return isActive;
        });

        console.log('🔧 [GlobalAlarmSoundManager] Filtered result:', {
            total: alarms?.length || 0,
            active: filtered.length,
            critical: filtered.filter(a => a.severity === 'critical').length,
            warning: filtered.filter(a => a.severity === 'warning').length,
            info: filtered.filter(a => a.severity === 'info').length
        });

        return filtered;
    }, [wsActiveAlarms, wsAlarmSummary]);

    // Critical alarms calculation
    const currentCriticalAlarms = useMemo(() => {
        return currentActiveAlarms.filter(a => a.severity === 'critical');
    }, [currentActiveAlarms]);

    // 🚨 AUTO-TRIGGER ALARM SOUNDS for new events
    useEffect(() => {
        if (!soundEnabled || !wsAlarmEvents?.length) {
            return;
        }

        const latestEvent = wsAlarmEvents[0];
        const eventType = latestEvent.event_type || latestEvent.type;

        if (eventType === 'triggered' || eventType === 'alarm_triggered') {
            const eventTime = new Date(latestEvent.created_at || latestEvent.timestamp).getTime();
            const now = Date.now();
            const timeDiff = now - eventTime;

            console.log('🚨 [GlobalAlarmSoundManager] NEW TRIGGERED EVENT:', {
                ruleName: latestEvent.rule_name,
                eventType,
                timeDiff: `${Math.round(timeDiff / 1000)}s ago`,
                severity: latestEvent.severity
            });

            // Play sound for recent events (within 5 minutes)
            if (timeDiff < 300000) {
                console.log('🔊 [GlobalAlarmSoundManager] AUTO-PLAYING ALARM SOUND for:', latestEvent.rule_name);

                playAlarmSequence(latestEvent.severity || 'warning', {
                    rule_name: latestEvent.rule_name,
                    tag_name: latestEvent.tag_name,
                    device_name: latestEvent.device_name,
                    trigger_value: latestEvent.trigger_value
                });
            }
        }
    }, [wsAlarmEvents, playAlarmSequence, soundEnabled]);

    // 🔇 STOP SOUNDS when no active alarms
    useEffect(() => {
        if (!soundEnabled) return;

        // If no active alarms, stop any playing sounds
        if (!currentActiveAlarms || currentActiveAlarms.length === 0) {
            console.log('🔇 [GlobalAlarmSoundManager] No active alarms - stopping sounds');
            stopAlarm();
        }
    }, [currentActiveAlarms, stopAlarm, soundEnabled]);

    // Log current status for debugging
    useEffect(() => {
        console.log('🔊 [GlobalAlarmSoundManager] Status update:', {
            isConnected,
            soundEnabled,
            activeAlarmsCount: currentActiveAlarms.length,
            criticalAlarmsCount: currentCriticalAlarms.length,
            currentlyPlaying: currentAlarm?.rule_name || null,
            soundStatus
        });
    }, [isConnected, soundEnabled, currentActiveAlarms.length, currentCriticalAlarms.length, currentAlarm, soundStatus]);

    // This component doesn't render anything - it's just for sound management
    return null;
}

export default GlobalAlarmSoundManager;