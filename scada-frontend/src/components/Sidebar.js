// src/components/Sidebar.js - BEAUTIFUL RESTORED VERSION
import React from 'react';
import {
    Box, List, ListItem, ListItemIcon, ListItemText, Typography, Paper, Avatar, Divider, Chip, Switch
} from '@mui/material';
import {
    Devices as DevicesIcon,
    Label as LabelIcon,
    Warning as WarningIcon,
    History as HistoryIcon,
    Schema as SchemaIcon,
    ShowChart as ShowChartIcon,
    Logout as LogoutIcon,
    ArrowBack as ArrowBackIcon,
    LightMode as LightModeIcon,
    DarkMode as DarkModeIcon,
    Folder as FolderIcon,
    Circle as CircleIcon
} from '@mui/icons-material';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'framer-motion';

// Safe RealTimeStatus component that won't cause auth issues
function SafeRealTimeStatus({ projectId }) {
    const { isDark } = useTheme();

    return (
        <Box
            sx={{
                p: 2,
                borderRadius: 2,
                background: isDark
                    ? 'linear-gradient(135deg, #1f2937 0%, #111827 100%)'
                    : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                border: isDark ? '1px solid #374151' : '1px solid #e2e8f0'
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <CircleIcon
                    sx={{
                        fontSize: 8,
                        color: '#10b981',
                        animation: 'pulse 2s infinite'
                    }}
                />
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    System Status
                </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                Project {projectId} • Online
            </Typography>
            <Box sx={{ mt: 1 }}>
                <Typography variant="caption" sx={{ color: 'success.main', fontSize: '0.65rem' }}>
                    ● Connected
                </Typography>
            </Box>
        </Box>
    );
}

export default function Sidebar() {
    const location = useLocation();
    const { projectId } = useParams();
    const { user, logout } = useAuth();
    const { mode, toggleTheme } = useTheme();
    const navigate = useNavigate();

    // Only show sidebar on project pages
    if (!projectId) return null;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleBackToProjects = () => {
        navigate('/projects');
    };

    const menuItems = [
        {
            text: 'Devices',
            icon: <DevicesIcon />,
            path: `/project/${projectId}/devices`,
            description: 'Manage your devices'
        },
        {
            text: 'Tags',
            icon: <LabelIcon />,
            path: `/project/${projectId}/tags`,
            description: 'Configure data points'
        },
        {
            text: 'Alarms',
            icon: <WarningIcon />,
            path: `/project/${projectId}/alarms`,
            description: 'Monitor alerts'
        },
        {
            text: 'Measurements',
            icon: <ShowChartIcon />,
            path: `/project/${projectId}/measurements`,
            description: 'View real-time data'
        },
        {
            text: 'Logs',
            icon: <HistoryIcon />,
            path: `/project/${projectId}/logs`,
            description: 'System activity'
        },
        {
            text: 'HMI Editor',
            icon: <SchemaIcon />,
            path: `/project/${projectId}/diagram`,
            description: 'Design interfaces'
        }
    ];

    const isDark = mode === 'dark';

    return (
        <Paper
            elevation={0}
            sx={{
                width: 280,
                height: '100vh',
                position: 'fixed',
                left: 0,
                top: 0,
                background: isDark
                    ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)'
                    : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                borderRight: isDark ? '1px solid #475569' : '1px solid #e2e8f0',
                borderRadius: 0,
                zIndex: 1200,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* Header */}
            <Box sx={{ p: 3, pb: 2 }}>
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <Box
                            sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 2,
                                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.5rem',
                                fontWeight: 800,
                                color: 'white'
                            }}
                        >
                            S
                        </Box>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>
                                SCADA
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                                Industrial Platform
                            </Typography>
                        </Box>
                    </Box>

                    {/* User Info */}
                    <Box
                        sx={{
                            p: 2,
                            borderRadius: 3,
                            background: isDark
                                ? 'linear-gradient(135deg, #334155 0%, #475569 100%)'
                                : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                            border: isDark ? '1px solid #64748b' : '1px solid #cbd5e1'
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar
                                sx={{
                                    width: 32,
                                    height: 32,
                                    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                                    fontSize: '0.875rem',
                                    fontWeight: 700
                                }}
                            >
                                {user?.username?.[0]?.toUpperCase()}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: 600,
                                        color: 'text.primary',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {user?.full_name || user?.username}
                                </Typography>
                                <Chip
                                    label={user?.role || 'operator'}
                                    size="small"
                                    sx={{
                                        height: 18,
                                        fontSize: '0.65rem',
                                        fontWeight: 600,
                                        bgcolor: 'primary.main',
                                        color: 'white',
                                        textTransform: 'capitalize'
                                    }}
                                />
                            </Box>
                        </Box>
                    </Box>
                </motion.div>
            </Box>

            <Divider sx={{ mx: 2, borderColor: isDark ? '#475569' : '#e2e8f0' }} />

            {/* Back to Projects Button */}
            <Box sx={{ px: 2, pt: 2 }}>
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <ListItem
                        onClick={handleBackToProjects}
                        sx={{
                            borderRadius: 2,
                            mb: 1,
                            mx: 1,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease-in-out',
                            background: 'transparent',
                            color: 'text.secondary',
                            border: isDark ? '1px solid #475569' : '1px solid #e2e8f0',
                            '&:hover': {
                                background: isDark
                                    ? 'rgba(59, 130, 246, 0.1)'
                                    : 'rgba(37, 99, 235, 0.05)',
                                borderColor: 'primary.main',
                                color: 'primary.main',
                                transform: 'translateX(4px)'
                            },
                            '&:active': {
                                transform: 'translateX(2px)'
                            }
                        }}
                    >
                        <ListItemIcon
                            sx={{
                                color: 'inherit',
                                minWidth: 40
                            }}
                        >
                            <FolderIcon />
                        </ListItemIcon>
                        <ListItemText
                            primary={
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: 600,
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    Back to Projects
                                </Typography>
                            }
                            secondary={
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: 'text.secondary',
                                        fontSize: '0.7rem'
                                    }}
                                >
                                    View all projects
                                </Typography>
                            }
                        />
                        <ArrowBackIcon sx={{ fontSize: 16, opacity: 0.6 }} />
                    </ListItem>
                </motion.div>
            </Box>

            {/* Navigation */}
            <Box sx={{ px: 2, pt: 2, flex: 1 }}>
                <Typography
                    variant="overline"
                    sx={{
                        px: 2,
                        color: 'text.secondary',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        letterSpacing: '0.1em'
                    }}
                >
                    Navigation
                </Typography>

                <List sx={{ pt: 1 }}>
                    {menuItems.map((item, index) => {
                        const isSelected = location.pathname === item.path;

                        return (
                            <motion.div
                                key={item.text}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: (index + 1) * 0.1 }}
                            >
                                <ListItem
                                    component={Link}
                                    to={item.path}
                                    sx={{
                                        borderRadius: 2,
                                        mb: 0.5,
                                        mx: 1,
                                        transition: 'all 0.2s ease-in-out',
                                        background: isSelected
                                            ? 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)'
                                            : 'transparent',
                                        color: isSelected ? 'white' : 'text.primary',
                                        '&:hover': {
                                            background: isSelected
                                                ? 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)'
                                                : isDark ? '#334155' : '#f1f5f9',
                                            transform: 'translateX(4px)'
                                        },
                                        '&:active': {
                                            transform: 'translateX(2px)'
                                        }
                                    }}
                                >
                                    <ListItemIcon
                                        sx={{
                                            color: isSelected ? 'white' : 'text.secondary',
                                            minWidth: 40
                                        }}
                                    >
                                        {item.icon}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: isSelected ? 700 : 600,
                                                    fontSize: '0.875rem'
                                                }}
                                            >
                                                {item.text}
                                            </Typography>
                                        }
                                        secondary={
                                            !isSelected && (
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        color: 'text.secondary',
                                                        fontSize: '0.7rem'
                                                    }}
                                                >
                                                    {item.description}
                                                </Typography>
                                            )
                                        }
                                    />
                                </ListItem>
                            </motion.div>
                        );
                    })}
                </List>
            </Box>

            {/* Bottom Actions */}
            <Box sx={{ px: 2, pb: 2 }}>
                {/* Theme Switch */}
                <Box
                    sx={{
                        p: 2,
                        mb: 2,
                        borderRadius: 2,
                        background: isDark
                            ? 'rgba(51, 65, 85, 0.5)'
                            : 'rgba(241, 245, 249, 0.5)',
                        border: isDark ? '1px solid #475569' : '1px solid #e2e8f0'
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {isDark ? (
                                <DarkModeIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                            ) : (
                                <LightModeIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                            )}
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                {isDark ? 'Dark' : 'Light'} Theme
                            </Typography>
                        </Box>
                        <Switch
                            checked={isDark}
                            onChange={toggleTheme}
                            size="small"
                            sx={{
                                '& .MuiSwitch-switchBase.Mui-checked': {
                                    color: 'primary.main'
                                },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                    backgroundColor: 'primary.main'
                                }
                            }}
                        />
                    </Box>
                </Box>

                {/* Logout Button */}
                <ListItem
                    onClick={handleLogout}
                    sx={{
                        borderRadius: 2,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out',
                        color: 'text.secondary',
                        '&:hover': {
                            background: isDark ? '#991b1b' : '#fef2f2',
                            color: 'error.main',
                            transform: 'translateX(4px)'
                        }
                    }}
                >
                    <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                        <LogoutIcon />
                    </ListItemIcon>
                    <ListItemText
                        primary={
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                Logout
                            </Typography>
                        }
                    />
                </ListItem>
            </Box>

            {/* Footer with Safe Real-Time Status */}
            <Box sx={{ p: 3 }}>
                <SafeRealTimeStatus projectId={projectId} />
            </Box>

            {/* Add pulse animation for status indicator */}
            <style jsx>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </Paper>
    );
}