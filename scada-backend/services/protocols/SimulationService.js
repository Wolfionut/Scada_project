// services/protocols/SimulationService.js - FIXED: Individual Tag Intervals
class SimulationService {
    constructor() {
        this.simulationProcesses = new Map(); // deviceId -> { device, intervals: Map<tagId, intervalId> }
        this.deviceStates = new Map();
        this.dataPatterns = this.initializeDataPatterns();
    }

    initializeDataPatterns() {
        return {
            temperature: {
                baseValue: 25, amplitude: 15, frequency: 0.01, noise: 2, trend: 0, units: '°C', quality: 'good'
            },
            pressure: {
                baseValue: 100, amplitude: 20, frequency: 0.005, noise: 1.5, trend: 0, units: 'bar', quality: 'good'
            },
            flow: {
                baseValue: 50, amplitude: 25, frequency: 0.02, noise: 3, trend: 0, units: 'L/min', quality: 'good'
            },
            level: {
                baseValue: 75, amplitude: 0, frequency: 0, noise: 0.5, trend: -0.01, units: '%', quality: 'good', min: 0, max: 100
            },
            motor_rpm: {
                baseValue: 1450, amplitude: 50, frequency: 0.03, noise: 10, trend: 0, units: 'RPM', quality: 'good'
            },
            voltage: {
                baseValue: 230, amplitude: 10, frequency: 0.001, noise: 0.5, trend: 0, units: 'V', quality: 'good'
            },
            current: {
                baseValue: 15, amplitude: 5, frequency: 0.008, noise: 0.3, trend: 0, units: 'A', quality: 'good'
            },
            vibration: {
                baseValue: 2.5, amplitude: 1.0, frequency: 0.05, noise: 0.2, trend: 0.001, units: 'mm/s', quality: 'good'
            },
            digital_status: {
                baseValue: 1, changeFrequency: 0.001, units: 'bool', quality: 'good'
            },
            counter: {
                baseValue: 0, increment: 0.1, units: 'count', quality: 'good'
            }
        };
    }

    async testConnection(deviceName) {
        const startTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
        const responseTime = Date.now() - startTime;

        return {
            connected: true,
            message: `Simulation device "${deviceName}" is ready with individual tag intervals.`,
            responseTime,
            protocol: 'Simulation',
            features: [
                'Individual tag update intervals',
                'Realistic industrial patterns',
                'Temperature, pressure, flow simulation',
                'Motor parameters with variations',
                'Digital I/O and counters'
            ]
        };
    }

    // 🚀 FIXED: Start simulation with INDIVIDUAL TAG INTERVALS
    async startSimulation(deviceConfig, tags = [], dataCallback = null) {
        const { device_id, device_name } = deviceConfig;
        const simulationKey = `${device_id}`;

        if (this.simulationProcesses.has(simulationKey)) {
            return {
                success: false,
                message: 'Simulation already running for this device'
            };
        }

        console.log(`🎯 Starting INDIVIDUAL TAG INTERVALS for device: ${device_name}`);

        // Filter only simulation tags
        const simulationTags = tags.filter(tag => tag.simulation === true);

        if (simulationTags.length === 0) {
            return {
                success: false,
                message: 'No simulation tags found for this device'
            };
        }

        // Initialize device state
        const deviceState = {
            device_id,
            device_name,
            startTime: Date.now(),
            tags: new Map(),
            patterns: new Map(),
            alarmStates: new Map()
        };

        // Initialize patterns for each tag
        simulationTags.forEach(tag => {
            const pattern = this.getPatternForTag(tag);
            deviceState.patterns.set(tag.tag_name, pattern);
            deviceState.tags.set(tag.tag_name, {
                ...tag,
                lastValue: pattern.baseValue,
                lastUpdate: Date.now()
            });
        });

        this.deviceStates.set(simulationKey, deviceState);

        // 🚀 CRITICAL FIX: Create individual intervals for each tag
        const tagIntervals = new Map();

        for (const tag of simulationTags) {
            const updateInterval = tag.update_interval || 1000; // Use tag's interval or default 1 second

            console.log(`⏱️ Starting tag "${tag.tag_name}" with interval: ${updateInterval}ms`);

            const tagInterval = setInterval(() => {
                const measurement = this.generateTagMeasurement(deviceState, tag);

                if (dataCallback) {
                    dataCallback([measurement]);
                }

                console.log(`📊 Generated: ${tag.tag_name} = ${measurement.value} (every ${updateInterval}ms)`);
            }, updateInterval);

            tagIntervals.set(tag.tag_id, {
                interval: tagInterval,
                tag_name: tag.tag_name,
                update_interval: updateInterval
            });
        }

        // Store the process with individual intervals
        this.simulationProcesses.set(simulationKey, {
            device_id,
            device_name,
            started_at: new Date(),
            tagIntervals: tagIntervals, // Store all individual tag intervals
            simulationTags: simulationTags
        });

        console.log(`✅ Started ${tagIntervals.size} individual tag intervals for ${device_name}`);

        return {
            success: true,
            message: `Simulation started for ${device_name} with individual tag intervals`,
            tags_count: simulationTags.length,
            tag_intervals: Array.from(tagIntervals.values()).map(t => ({
                tag_name: t.tag_name,
                interval_ms: t.update_interval
            })),
            simulation_type: 'individual_intervals',
            features: Object.keys(this.dataPatterns)
        };
    }

    // Generate measurement for a single tag
    generateTagMeasurement(deviceState, tag) {
        const currentTime = Date.now();
        const timeElapsed = (currentTime - deviceState.startTime) / 1000;

        const pattern = deviceState.patterns.get(tag.tag_name);
        const newValue = this.calculateTagValue(pattern, timeElapsed, tag.lastValue || pattern.baseValue);

        // Update tag state
        const tagInfo = deviceState.tags.get(tag.tag_name);
        if (tagInfo) {
            tagInfo.lastValue = newValue;
            tagInfo.lastUpdate = currentTime;
        }

        // Check alarms
        this.checkAlarmConditions(deviceState, tag.tag_name, newValue);

        return {
            tag_id: tag.tag_id,
            tag_name: tag.tag_name,
            value: newValue,
            quality: pattern.quality || 'good',
            timestamp: new Date(),
            device_id: deviceState.device_id,
            device_name: deviceState.device_name,
            units: pattern.units,
            simulation: true,
            source: 'individual_interval'
        };
    }

    // Calculate realistic tag value (same as before)
    calculateTagValue(pattern, timeElapsed, lastValue) {
        let value;

        // Apply tag-specific simulation pattern
        if (pattern.simulation_pattern) {
            switch (pattern.simulation_pattern.toLowerCase()) {
                case 'sine':
                    value = pattern.baseValue + pattern.amplitude * Math.sin(2 * Math.PI * pattern.frequency * timeElapsed);
                    break;
                case 'ramp':
                    const rampTime = (timeElapsed) % 60;
                    value = pattern.simulation_min + (rampTime / 60) * (pattern.simulation_max - pattern.simulation_min);
                    break;
                case 'random':
                default:
                    value = pattern.simulation_min + Math.random() * (pattern.simulation_max - pattern.simulation_min);
                    break;
            }
        } else {
            // Use default pattern behavior
            switch (pattern.type || 'analog') {
                case 'digital':
                    if (Math.random() < pattern.changeFrequency) {
                        value = lastValue === 1 ? 0 : 1;
                    } else {
                        value = lastValue;
                    }
                    break;
                case 'counter':
                    value = pattern.baseValue + (timeElapsed * pattern.increment);
                    break;
                case 'analog':
                default:
                    const sineComponent = pattern.amplitude * Math.sin(2 * Math.PI * pattern.frequency * timeElapsed);
                    const noiseComponent = (Math.random() - 0.5) * 2 * pattern.noise;
                    const trendComponent = pattern.trend * timeElapsed;
                    value = pattern.baseValue + sineComponent + noiseComponent + trendComponent;

                    if (pattern.min !== undefined) value = Math.max(value, pattern.min);
                    if (pattern.max !== undefined) value = Math.min(value, pattern.max);
                    break;
            }
        }

        return Math.round(value * 100) / 100;
    }

    getPatternForTag(tag) {
        const tagName = tag.tag_name.toLowerCase();

        // Use tag-specific simulation settings if available
        let pattern = {};

        if (tag.simulation_min !== null && tag.simulation_max !== null) {
            pattern.simulation_min = tag.simulation_min;
            pattern.simulation_max = tag.simulation_max;
            pattern.simulation_pattern = tag.simulation_pattern || 'random';
            pattern.baseValue = (tag.simulation_min + tag.simulation_max) / 2;
            pattern.amplitude = (tag.simulation_max - tag.simulation_min) / 4;
        }

        // Match by tag name to get defaults
        if (tagName.includes('temp')) {
            return { ...this.dataPatterns.temperature, ...pattern, type: 'analog' };
        } else if (tagName.includes('press')) {
            return { ...this.dataPatterns.pressure, ...pattern, type: 'analog' };
        } else if (tagName.includes('flow')) {
            return { ...this.dataPatterns.flow, ...pattern, type: 'analog' };
        } else if (tagName.includes('level')) {
            return { ...this.dataPatterns.level, ...pattern, type: 'analog' };
        } else if (tagName.includes('rpm')) {
            return { ...this.dataPatterns.motor_rpm, ...pattern, type: 'analog' };
        } else if (tagName.includes('volt')) {
            return { ...this.dataPatterns.voltage, ...pattern, type: 'analog' };
        } else if (tagName.includes('current')) {
            return { ...this.dataPatterns.current, ...pattern, type: 'analog' };
        } else if (tagName.includes('vibr')) {
            return { ...this.dataPatterns.vibration, ...pattern, type: 'analog' };
        } else if (tag.tag_type && tag.tag_type.includes('digital')) {
            return { ...this.dataPatterns.digital_status, ...pattern, type: 'digital' };
        }

        // Default analog pattern
        return {
            baseValue: pattern.simulation_min ? (pattern.simulation_min + pattern.simulation_max) / 2 : 50,
            amplitude: pattern.simulation_max ? (pattern.simulation_max - pattern.simulation_min) / 4 : 10,
            frequency: 0.01,
            noise: 2,
            trend: 0,
            units: tag.engineering_unit || 'units',
            quality: 'good',
            type: 'analog',
            ...pattern
        };
    }

    checkAlarmConditions(deviceState, tagName, value) {
        // Existing alarm logic...
        const alarmKey = `${tagName}_high`;
        const wasInAlarm = deviceState.alarmStates.get(alarmKey) || false;

        if (tagName.toLowerCase().includes('temp') && value > 80) {
            if (!wasInAlarm) {
                deviceState.alarmStates.set(alarmKey, true);
                console.log(`🚨 ALARM: High temperature on ${tagName}: ${value}°C`);
            }
        } else if (wasInAlarm && value < 75) {
            deviceState.alarmStates.set(alarmKey, false);
            console.log(`✅ ALARM CLEARED: Temperature normal on ${tagName}: ${value}°C`);
        }
    }

    // 🚀 FIXED: Stop all individual tag intervals
    async stopSimulation(deviceId) {
        const simulationKey = `${deviceId}`;
        const process = this.simulationProcesses.get(simulationKey);

        if (!process) {
            return {
                success: false,
                message: 'No active simulation found for this device'
            };
        }

        console.log(`🛑 Stopping ${process.tagIntervals.size} individual tag intervals for ${process.device_name}`);

        // Clear all individual tag intervals
        let stoppedCount = 0;
        for (const [tagId, tagData] of process.tagIntervals) {
            if (tagData.interval) {
                clearInterval(tagData.interval);
                stoppedCount++;
                console.log(`🛑 Stopped interval for tag: ${tagData.tag_name} (${tagData.update_interval}ms)`);
            }
        }

        // Cleanup
        this.simulationProcesses.delete(simulationKey);
        this.deviceStates.delete(simulationKey);

        console.log(`✅ Successfully stopped ${stoppedCount} tag intervals for device: ${process.device_name}`);

        return {
            success: true,
            message: `Simulation stopped for device ${process.device_name}`,
            stopped_intervals: stoppedCount
        };
    }

    getSimulationStatus(deviceId) {
        const simulationKey = `${deviceId}`;
        const process = this.simulationProcesses.get(simulationKey);
        const deviceState = this.deviceStates.get(simulationKey);

        if (!process) {
            return { running: false, status: 'stopped' };
        }

        return {
            running: true,
            status: 'running',
            device_name: process.device_name,
            started_at: process.started_at,
            tags_count: process.simulationTags.length,
            individual_intervals: process.tagIntervals.size,
            tag_intervals: Array.from(process.tagIntervals.values()).map(t => ({
                tag_name: t.tag_name,
                interval_ms: t.update_interval
            })),
            last_update: deviceState ? Math.max(...Array.from(deviceState.tags.values()).map(t => t.lastUpdate)) : null
        };
    }

    getCurrentValues(deviceId) {
        const simulationKey = `${deviceId}`;
        const deviceState = this.deviceStates.get(simulationKey);

        if (!deviceState) return {};

        const values = {};
        for (const [tagName, tagInfo] of deviceState.tags) {
            values[tagName] = {
                value: tagInfo.lastValue,
                timestamp: new Date(tagInfo.lastUpdate),
                units: deviceState.patterns.get(tagName)?.units || 'units'
            };
        }
        return values;
    }

    stopAllSimulations() {
        const deviceIds = Array.from(this.simulationProcesses.keys());
        console.log(`🛑 Stopping all simulations for ${deviceIds.length} devices`);

        for (const deviceId of deviceIds) {
            this.stopSimulation(deviceId);
        }
    }

    getSimulationStatistics() {
        const activeSimulations = this.simulationProcesses.size;
        const totalIntervals = Array.from(this.simulationProcesses.values())
            .reduce((sum, process) => sum + process.tagIntervals.size, 0);

        return {
            active_simulations: activeSimulations,
            total_individual_intervals: totalIntervals,
            available_patterns: Object.keys(this.dataPatterns),
            simulation_types: ['individual_intervals', 'analog', 'digital', 'counter']
        };
    }
}

module.exports = new SimulationService();