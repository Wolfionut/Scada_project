// src/hooks/useAlarmSoundEffects.js - FIXED AUTO-TRIGGER VERSION
import { useEffect, useRef } from 'react';
import { useAlarmSound } from '../context/AlarmSoundContext';

export function useAlarmSoundEffects(alarms, alarmEvents) {
    const { playAlarmSequence, stopAlarm, isEnabled } = useAlarmSound();
    const lastEventIdRef = useRef(null);
    const lastAlarmCountRef = useRef(0);

    // Debug logging
    useEffect(() => {
        console.log('🔊 useAlarmSoundEffects - Status:', {
            isEnabled,
            alarmEventsCount: alarmEvents?.length || 0,
            activeAlarmsCount: alarms?.length || 0,
            lastEventId: lastEventIdRef.current
        });
    }, [isEnabled, alarms, alarmEvents]);

    // Method 1: Watch for new alarm events (WebSocket real-time)
    useEffect(() => {
        if (!isEnabled || !alarmEvents?.length) {
            console.log('🔇 Auto-trigger disabled:', { isEnabled, hasEvents: !!alarmEvents?.length });
            return;
        }

        const latestEvent = alarmEvents[0];
        const eventId = latestEvent.id || latestEvent.created_at || Date.now();

        console.log('🔊 Checking latest alarm event:', {
            eventId,
            lastEventId: lastEventIdRef.current,
            eventType: latestEvent.type || latestEvent.event_type,
            ruleName: latestEvent.rule_name,
            createdAt: latestEvent.created_at
        });

        // Check if this is a new event we haven't processed
        if (eventId !== lastEventIdRef.current) {
            const eventType = latestEvent.type || latestEvent.event_type;

            if (eventType === 'triggered' || eventType === 'alarm_triggered') {
                const eventTime = new Date(latestEvent.created_at).getTime();
                const now = Date.now();
                const timeDiff = now - eventTime;

                console.log('🚨 NEW TRIGGERED EVENT DETECTED:', {
                    ruleName: latestEvent.rule_name,
                    eventType,
                    timeDiff: `${Math.round(timeDiff / 1000)}s ago`,
                    severity: latestEvent.severity
                });

                // Play sound for events within the last 5 minutes (more generous)
                if (timeDiff < 300000) { // 5 minutes = 300000ms
                    console.log('🔊 AUTO-PLAYING ALARM SOUND for:', latestEvent.rule_name);

                    playAlarmSequence(latestEvent.severity || 'warning', {
                        rule_name: latestEvent.rule_name,
                        tag_name: latestEvent.tag_name,
                        device_name: latestEvent.device_name,
                        trigger_value: latestEvent.trigger_value
                    });
                } else {
                    console.log('⏰ Event too old, not playing sound');
                }
            }

            // Update the last processed event ID
            lastEventIdRef.current = eventId;
        }
    }, [alarmEvents, playAlarmSequence, isEnabled]);

    // Method 2: Watch for changes in active alarm count (fallback)
    useEffect(() => {
        if (!isEnabled) return;

        const currentAlarmCount = alarms?.length || 0;
        const lastAlarmCount = lastAlarmCountRef.current;

        console.log('🔊 Alarm count change:', {
            current: currentAlarmCount,
            previous: lastAlarmCount,
            increased: currentAlarmCount > lastAlarmCount
        });

        // If alarm count increased, play sound for the most severe alarm
        if (currentAlarmCount > lastAlarmCount && currentAlarmCount > 0) {
            console.log('🚨 ALARM COUNT INCREASED - Playing sound!');

            // Find the most severe alarm
            const severityOrder = { critical: 3, warning: 2, info: 1 };
            const mostSevereAlarm = alarms?.reduce((prev, current) => {
                const prevSeverity = severityOrder[prev?.severity] || 0;
                const currentSeverity = severityOrder[current?.severity] || 0;
                return currentSeverity > prevSeverity ? current : prev;
            });

            if (mostSevereAlarm) {
                playAlarmSequence(mostSevereAlarm.severity || 'warning', {
                    rule_name: mostSevereAlarm.rule_name,
                    tag_name: mostSevereAlarm.tag_name,
                    device_name: mostSevereAlarm.device_name,
                    trigger_value: mostSevereAlarm.trigger_value
                });
            }
        }

        // Update the last alarm count
        lastAlarmCountRef.current = currentAlarmCount;
    }, [alarms, playAlarmSequence, isEnabled]);

    // Method 3: Stop sounds when no active alarms
    useEffect(() => {
        if (!isEnabled) return;

        // If no active alarms, stop any playing sounds
        if (!alarms || alarms.length === 0) {
            console.log('🔇 No active alarms - stopping sounds');
            stopAlarm();
        }
    }, [alarms, stopAlarm, isEnabled]);

    // Manual trigger function for testing
    const triggerTestAlarm = (severity = 'warning') => {
        console.log('🧪 Manual test alarm triggered');
        playAlarmSequence(severity, {
            rule_name: 'Test Alarm',
            tag_name: 'Test Tag',
            device_name: 'Test Device',
            test: true
        });
    };

    return {
        playAlarmSequence,
        stopAlarm,
        triggerTestAlarm // Export for manual testing
    };
}