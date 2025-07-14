// src/context/AlarmSoundContext.js - Global Alarm Sound Management
import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';

const AlarmSoundContext = createContext();

// Sound configuration
const ALARM_SOUNDS = {
    critical: {
        frequency: [800, 1000, 800, 1000], // Alternating high-pitched beeps
        duration: 0.3,
        interval: 0.1,
        volume: 0.8,
        repeat: true,
        color: '#dc2626'
    },
    warning: {
        frequency: [600, 800], // Medium pitch
        duration: 0.5,
        interval: 0.3,
        volume: 0.6,
        repeat: true,
        color: '#f59e0b'
    },
    info: {
        frequency: [400], // Low pitch
        duration: 0.3,
        interval: 1.0,
        volume: 0.4,
        repeat: false,
        color: '#2563eb'
    }
};

export function AlarmSoundProvider({ children }) {
    const audioContextRef = useRef(null);
    const currentSoundRef = useRef(null);
    const intervalRef = useRef(null);
    const [isEnabled, setIsEnabled] = useState(() => {
        return localStorage.getItem('alarmSoundsEnabled') !== 'false';
    });
    const [masterVolume, setMasterVolume] = useState(() => {
        return parseFloat(localStorage.getItem('alarmMasterVolume') || '0.7');
    });
    const [currentAlarm, setCurrentAlarm] = useState(null);
    const [soundStatus, setSoundStatus] = useState('idle'); // idle, playing, muted

    // Initialize Audio Context
    const initAudioContext = useCallback(async () => {
        if (!audioContextRef.current) {
            try {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();

                // Handle browser autoplay policy
                if (audioContextRef.current.state === 'suspended') {
                    await audioContextRef.current.resume();
                }

                console.log('🔊 Audio context initialized');
                return true;
            } catch (error) {
                console.error('❌ Failed to initialize audio context:', error);
                return false;
            }
        }
        return true;
    }, []);

    // Generate tone using Web Audio API
    const generateTone = useCallback((frequency, duration, volume = 0.5) => {
        if (!audioContextRef.current) {
            console.error('❌ Audio context not available');
            return;
        }

        try {
            const oscillator = audioContextRef.current.createOscillator();
            const gainNode = audioContextRef.current.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContextRef.current.destination);

            oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
            oscillator.type = 'sine';

            const adjustedVolume = volume * masterVolume;
            gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime);
            gainNode.gain.linearRampToValueAtTime(adjustedVolume, audioContextRef.current.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration);

            oscillator.start(audioContextRef.current.currentTime);
            oscillator.stop(audioContextRef.current.currentTime + duration);

            currentSoundRef.current = oscillator;

            console.log(`🔊 Generated tone: ${frequency}Hz for ${duration}s at ${adjustedVolume} volume`);
        } catch (error) {
            console.error('❌ Error generating tone:', error);
        }
    }, [masterVolume]);

    // Play alarm sound sequence
    const playAlarmSequence = useCallback(async (severity = 'warning', alarmData = null) => {
        if (!isEnabled) {
            console.log('🔇 Alarm sounds are disabled');
            return;
        }

        // Initialize audio context if needed
        const audioReady = await initAudioContext();
        if (!audioReady) {
            console.error('❌ Cannot play alarm: Audio context not available');
            return;
        }

        const soundConfig = ALARM_SOUNDS[severity] || ALARM_SOUNDS.warning;

        setCurrentAlarm({ severity, ...alarmData, timestamp: Date.now() });
        setSoundStatus('playing');

        console.log(`🚨 Playing ${severity} alarm sound`);

        let sequenceIndex = 0;

        const playSequence = () => {
            if (!isEnabled || !audioContextRef.current) {
                stopAlarm();
                return;
            }

            const frequency = soundConfig.frequency[sequenceIndex % soundConfig.frequency.length];
            generateTone(frequency, soundConfig.duration, soundConfig.volume);

            sequenceIndex++;

            // Continue sequence if repeat is enabled
            if (soundConfig.repeat || sequenceIndex < soundConfig.frequency.length) {
                intervalRef.current = setTimeout(playSequence, (soundConfig.duration + soundConfig.interval) * 1000);
            } else {
                // Single play sequence finished
                setTimeout(() => {
                    setSoundStatus('idle');
                    setCurrentAlarm(null);
                }, soundConfig.duration * 1000);
            }
        };

        playSequence();
    }, [isEnabled, initAudioContext, generateTone]);

    // Stop alarm sound
    const stopAlarm = useCallback(() => {
        if (intervalRef.current) {
            clearTimeout(intervalRef.current);
            intervalRef.current = null;
        }

        if (currentSoundRef.current) {
            try {
                currentSoundRef.current.stop();
                currentSoundRef.current = null;
            } catch (error) {
                console.log('Audio already stopped');
            }
        }

        setSoundStatus('idle');
        setCurrentAlarm(null);

        console.log('🔇 Alarm sound stopped');
    }, []);

    // Play test sound
    const playTestSound = useCallback(async (severity = 'warning') => {
        await playAlarmSequence(severity, { rule_name: 'Test Alarm', test: true });

        // Auto-stop test sound after 3 seconds
        setTimeout(() => {
            stopAlarm();
        }, 3000);
    }, [playAlarmSequence, stopAlarm]);

    // Toggle sound enabled state
    const toggleSounds = useCallback(() => {
        const newEnabled = !isEnabled;
        setIsEnabled(newEnabled);
        localStorage.setItem('alarmSoundsEnabled', newEnabled.toString());

        if (!newEnabled) {
            stopAlarm();
        }

        console.log(`🔊 Alarm sounds ${newEnabled ? 'enabled' : 'disabled'}`);
    }, [isEnabled, stopAlarm]);

    // Set enabled state directly
    const setEnabled = useCallback((enabled) => {
        setIsEnabled(enabled);
        localStorage.setItem('alarmSoundsEnabled', enabled.toString());

        if (!enabled) {
            stopAlarm();
        }

        console.log(`🔊 Alarm sounds ${enabled ? 'enabled' : 'disabled'}`);
    }, [stopAlarm]);

    // Set master volume
    const setVolume = useCallback((volume) => {
        const clampedVolume = Math.max(0, Math.min(1, volume));
        setMasterVolume(clampedVolume);
        localStorage.setItem('alarmMasterVolume', clampedVolume.toString());
        console.log(`🔊 Master volume set to: ${Math.round(clampedVolume * 100)}%`);
    }, []);

    // Get current volume as percentage
    const volume = masterVolume;

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearTimeout(intervalRef.current);
            }
            if (currentSoundRef.current) {
                try {
                    currentSoundRef.current.stop();
                } catch (error) {
                    // Audio already stopped
                }
            }
        };
    }, []);

    const value = {
        // State
        isEnabled,
        masterVolume: volume,
        currentAlarm,
        soundStatus,

        // Functions
        playAlarmSequence,
        stopAlarm,
        playTestSound,
        toggleSounds,
        setEnabled,
        setVolume,

        // Aliases for compatibility
        volume,
        setVolume
    };

    return (
        <AlarmSoundContext.Provider value={value}>
            {children}
        </AlarmSoundContext.Provider>
    );
}

export const useAlarmSound = () => {
    const context = useContext(AlarmSoundContext);
    if (!context) {
        throw new Error('useAlarmSound must be used within an AlarmSoundProvider');
    }
    return context;
};