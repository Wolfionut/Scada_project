// src/symbols/symbolList.js - Modern Industrial Symbol List
import ModernTank from './ModernTank';
import ModernTankIcon from './ModernTankIcon';
import ModernPump from './ModernPump';
import ModernPumpIcon from './ModernPumpIcon';
import ModernValve from './ModernValve';
import ModernValveIcon from './ModernValveIcon';
import ModernMotor from './ModernMotor';
import ModernMotorIcon from './ModernMotorIcon';
import ModernSensor from './ModernSensor';
import ModernSensorIcon from './ModernSensorIcon';
import ModernPipe from './ModernPipe';

// Modern industrial symbols for SCADA/HMI diagrams
const symbolList = [
    {
        label: 'Storage Tank',
        key: 'tank',
        icon: ModernTank,
        sidebarIcon: ModernTankIcon,
        width: 80,
        height: 100,
        description: 'Industrial storage tank with level indication and status monitoring',
        defaultProps: {
            active: true,
            status: 'online',
            fillLevel: 75
        }
    },
    {
        label: 'Centrifugal Pump',
        key: 'pump',
        icon: ModernPump,
        sidebarIcon: ModernPumpIcon,
        width: 90,
        height: 70,
        description: 'Centrifugal pump with motor, flow indication and status monitoring',
        defaultProps: {
            active: true,
            status: 'online',
            speed: 1450
        }
    },
    {
        label: 'Control Valve',
        key: 'valve',
        icon: ModernValve,
        sidebarIcon: ModernValveIcon,
        width: 70,
        height: 70,
        description: 'Automated control valve with position feedback and flow indication',
        defaultProps: {
            active: true,
            status: 'online',
            position: 100
        }
    },
    {
        label: 'Electric Motor',
        key: 'motor',
        icon: ModernMotor,
        sidebarIcon: ModernMotorIcon,
        width: 80,
        height: 70,
        description: 'Three-phase electric motor with RPM monitoring and status indication',
        defaultProps: {
            active: true,
            status: 'online',
            rpm: 1450
        }
    },
    {
        label: 'Process Sensor',
        key: 'sensor',
        icon: ModernSensor,
        sidebarIcon: ModernSensorIcon,
        width: 60,
        height: 60,
        description: 'Multi-purpose process sensor (temperature, pressure, flow, level)',
        defaultProps: {
            active: true,
            status: 'online',
            sensorType: 'temperature'
        }
    }
];

// Pipe component for connections (used programmatically, not in sidebar)
export const PipeComponent = ModernPipe;

// Status definitions for real-time indication
export const statusTypes = {
    online: {
        label: 'Online',
        color: '#4CAF50',
        description: 'Device is operational and communicating normally'
    },
    offline: {
        label: 'Offline',
        color: '#757575',
        description: 'Device is not communicating or powered off'
    },
    warning: {
        label: 'Warning',
        color: '#FF9800',
        description: 'Device has minor issues, warnings, or maintenance alerts'
    },
    error: {
        label: 'Error',
        color: '#F44336',
        description: 'Device has critical errors, faults, or alarms'
    }
};

// Sensor type definitions for configuration
export const sensorTypes = {
    temperature: {
        label: 'Temperature Sensor',
        unit: '°C',
        icon: 'temperature',
        description: 'Measures process temperature'
    },
    pressure: {
        label: 'Pressure Transmitter',
        unit: 'bar',
        icon: 'pressure',
        description: 'Measures process pressure'
    },
    flow: {
        label: 'Flow Meter',
        unit: 'L/min',
        icon: 'flow',
        description: 'Measures flow rate'
    },
    level: {
        label: 'Level Transmitter',
        unit: '%',
        icon: 'level',
        description: 'Measures tank or vessel level'
    }
};

// Helper function to create symbol with real-time data integration
export const createSymbolWithData = (symbolType, deviceData, measurements) => {
    const symbolConfig = symbolList.find(s => s.key === symbolType);
    if (!symbolConfig) return null;

    // Base properties from symbol configuration
    const symbolProps = {
        ...symbolConfig.defaultProps,
        active: deviceData?.connected || false,
        status: getDeviceStatus(deviceData, measurements),
    };

    // Add type-specific real-time properties
    switch (symbolType) {
        case 'tank':
            symbolProps.fillLevel = getTagValue(deviceData?.levelTag, measurements) || deviceData?.fillLevel || 0;
            break;
        case 'pump':
            symbolProps.speed = getTagValue(deviceData?.speedTag, measurements) || deviceData?.speed || 0;
            break;
        case 'valve':
            symbolProps.position = getTagValue(deviceData?.positionTag, measurements) || deviceData?.position || 0;
            break;
        case 'motor':
            symbolProps.rpm = getTagValue(deviceData?.rpmTag, measurements) || deviceData?.rpm || 0;
            break;
        case 'sensor':
            symbolProps.sensorType = deviceData?.sensorType || 'temperature';
            symbolProps.value = getTagValue(deviceData?.valueTag, measurements);
            break;
    }

    return {
        ...symbolConfig,
        props: symbolProps
    };
};

// Helper function to get tag value from measurements
const getTagValue = (tagName, measurements) => {
    if (!tagName || !measurements) return null;
    return measurements[tagName]?.value || null;
};

// Helper function to determine device status from real-time data
const getDeviceStatus = (deviceData, measurements) => {
    if (!deviceData?.connected) return 'offline';

    // Check for alarms or errors
    if (deviceData?.alarms?.some(alarm => alarm.severity === 'critical')) return 'error';
    if (deviceData?.alarms?.some(alarm => alarm.severity === 'warning')) return 'warning';

    // Check tag data quality
    if (deviceData?.linkedTag) {
        const tagValue = getTagValue(deviceData.linkedTag, measurements);
        if (tagValue === null || tagValue === undefined) return 'warning';
    }

    return 'online';
};

// Color schemes for different operational modes
export const colorSchemes = {
    production: {
        online: { primary: '#2E7D32', secondary: '#A5D6A7', accent: '#1B5E20' },
        warning: { primary: '#F57C00', secondary: '#FFB74D', accent: '#E65100' },
        error: { primary: '#D32F2F', secondary: '#FFAB91', accent: '#B71C1C' },
        offline: { primary: '#757575', secondary: '#BDBDBD', accent: '#424242' }
    },
    maintenance: {
        online: { primary: '#1976D2', secondary: '#BBDEFB', accent: '#0D47A1' },
        warning: { primary: '#F57C00', secondary: '#FFB74D', accent: '#E65100' },
        error: { primary: '#D32F2F', secondary: '#FFAB91', accent: '#B71C1C' },
        offline: { primary: '#757575', secondary: '#BDBDBD', accent: '#424242' }
    },
    testing: {
        online: { primary: '#7B1FA2', secondary: '#CE93D8', accent: '#4A148C' },
        warning: { primary: '#F57C00', secondary: '#FFB74D', accent: '#E65100' },
        error: { primary: '#D32F2F', secondary: '#FFAB91', accent: '#B71C1C' },
        offline: { primary: '#757575', secondary: '#BDBDBD', accent: '#424242' }
    }
};

// Export default symbol list
export default symbolList;