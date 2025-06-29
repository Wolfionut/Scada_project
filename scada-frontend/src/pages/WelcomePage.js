// src/pages/WelcomePage.js - Modern Professional Landing Page
import React from 'react';
import {
    Box, Typography, Button, Container, Grid, Card, CardContent, Avatar,
    Stack, Chip, Paper, IconButton, Divider
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Memory as MemoryIcon,
    Timeline as TimelineIcon,
    Security as SecurityIcon,
    Speed as SpeedIcon,
    Cloud as CloudIcon,
    ArrowForward as ArrowForwardIcon,
    PlayArrow as PlayArrowIcon,
    Star as StarIcon,
    TrendingUp as TrendingUpIcon,
    Settings as SettingsIcon,
    Notifications as NotificationsIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const FeatureCard = ({ icon: Icon, title, description, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.6 }}
        whileHover={{ y: -8 }}
    >
        <Card
            sx={{
                height: '100%',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: '1px solid #e2e8f0',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                    borderColor: '#2563eb',
                    boxShadow: '0 20px 40px rgb(37 99 235 / 0.1)',
                    '& .feature-icon': {
                        transform: 'scale(1.1)',
                        background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                        color: 'white'
                    }
                }
            }}
        >
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Avatar
                    className="feature-icon"
                    sx={{
                        width: 64,
                        height: 64,
                        mx: 'auto',
                        mb: 2,
                        background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                        color: 'primary.main',
                        transition: 'all 0.3s ease-in-out'
                    }}
                >
                    <Icon fontSize="large" />
                </Avatar>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
                    {title}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    {description}
                </Typography>
            </CardContent>
        </Card>
    </motion.div>
);

const StatCard = ({ number, label, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay, duration: 0.6 }}
    >
        <Paper
            sx={{
                p: 3,
                textAlign: 'center',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: '1px solid #e2e8f0'
            }}
        >
            <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.main', mb: 1 }}>
                {number}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                {label}
            </Typography>
        </Paper>
    </motion.div>
);

export default function WelcomePage() {
    const navigate = useNavigate();

    return (
        <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
            {/* Navigation */}
            <Box
                sx={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 1000,
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    borderBottom: '1px solid #e2e8f0'
                }}
            >
                <Container maxWidth="lg">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar
                                sx={{
                                    width: 40,
                                    height: 40,
                                    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                                    fontWeight: 800,
                                    fontSize: '1.2rem'
                                }}
                            >
                                S
                            </Avatar>
                            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
                                SCADA Platform
                            </Typography>
                        </Box>

                        <Stack direction="row" spacing={2}>
                            <Button
                                variant="outlined"
                                onClick={() => navigate('/login')}
                                sx={{ borderRadius: 2, px: 3 }}
                            >
                                Sign In
                            </Button>
                            <Button
                                variant="contained"
                                onClick={() => navigate('/register')}
                                sx={{
                                    borderRadius: 2,
                                    px: 3,
                                    background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)'
                                }}
                            >
                                Get Started
                            </Button>
                        </Stack>
                    </Box>
                </Container>
            </Box>

            {/* Hero Section */}
            <Container maxWidth="lg" sx={{ py: 8 }}>
                <Grid container spacing={6} alignItems="center">
                    <Grid item xs={12} md={6}>
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8 }}
                        >
                            <Stack spacing={3}>
                                <Chip
                                    label="🚀 Next-Generation Industrial Platform"
                                    color="primary"
                                    sx={{
                                        alignSelf: 'flex-start',
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                        py: 2,
                                        px: 2
                                    }}
                                />

                                <Typography
                                    variant="h2"
                                    sx={{
                                        fontWeight: 800,
                                        lineHeight: 1.1,
                                        background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                                        backgroundClip: 'text',
                                        WebkitBackgroundClip: 'text',
                                        color: 'transparent'
                                    }}
                                >
                                    Industrial IoT &amp; SCADA Platform
                                </Typography>

                                <Typography
                                    variant="h5"
                                    color="text.secondary"
                                    sx={{ lineHeight: 1.6, fontWeight: 400 }}
                                >
                                    Monitor, control, and optimize your industrial processes with real-time data,
                                    advanced analytics, and intelligent automation.
                                </Typography>

                                <Stack direction="row" spacing={2} sx={{ pt: 2 }}>
                                    <Button
                                        variant="contained"
                                        size="large"
                                        endIcon={<ArrowForwardIcon />}
                                        onClick={() => navigate('/register')}
                                        sx={{
                                            borderRadius: 3,
                                            px: 4,
                                            py: 1.5,
                                            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                                            fontSize: '1.1rem',
                                            fontWeight: 700,
                                            '&:hover': {
                                                background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                                                transform: 'translateY(-2px)'
                                            }
                                        }}
                                    >
                                        Start Creating
                                    </Button>

                                </Stack>
                            </Stack>
                        </motion.div>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                        >
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 4,
                                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: 4
                                }}
                            >
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <StatCard number="99.9%" label="Uptime" delay={0.3} />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <StatCard number="1M+" label="Data Points/sec" delay={0.4} />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <StatCard number="500+" label="Connected Devices" delay={0.5} />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <StatCard number="24/7" label="Monitoring" delay={0.6} />
                                    </Grid>
                                </Grid>
                            </Paper>
                        </motion.div>
                    </Grid>
                </Grid>
            </Container>

            {/* Features Section */}
            <Container maxWidth="lg" sx={{ py: 8 }}>
                <Box sx={{ textAlign: 'center', mb: 6 }}>
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <Typography
                            variant="h3"
                            sx={{
                                fontWeight: 800,
                                mb: 2,
                                background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                color: 'transparent'
                            }}
                        >
                            Powerful Features
                        </Typography>
                        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
                            Everything you need to manage your industrial operations efficiently
                        </Typography>
                    </motion.div>
                </Box>

                <Grid container spacing={4}>
                    <Grid item xs={12} md={4}>
                        <FeatureCard
                            icon={DashboardIcon}
                            title="Real-Time Dashboards"
                            description="Interactive HMI interfaces with live data visualization, widgets, and responsive design for any device."
                            delay={0.1}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <FeatureCard
                            icon={MemoryIcon}
                            title="Device Management"
                            description="Connect and manage industrial devices with support for Modbus, MQTT or try our data simulator."
                            delay={0.2}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <FeatureCard
                            icon={NotificationsIcon}
                            title="Smart Alarms"
                            description="Intelligent alarm system with configurable thresholds, escalation rules, and multi-channel notifications."
                            delay={0.3}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <FeatureCard
                            icon={TimelineIcon}
                            title="Data Analytics"
                            description="Advanced analytics with historical trending, pattern recognition, and predictive maintenance insights."
                            delay={0.4}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <FeatureCard
                            icon={SecurityIcon}
                            title="Enterprise Security"
                            description="Role-based access control, audit logging, and encrypted communications for industrial-grade security."
                            delay={0.5}
                        />
                    </Grid>

                </Grid>
            </Container>

            {/* CTA Section */}
            <Box
                sx={{
                    py: 8,
                    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                    color: 'white'
                }}
            >
                <Container maxWidth="lg">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>
                                Ready to Transform Your Operations?
                            </Typography>
                            <Typography variant="h6" sx={{ mb: 4, opacity: 0.9, maxWidth: 600, mx: 'auto' }}>
                                Join our platform to optimize your industrial processes.
                            </Typography>

                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={2}
                                justifyContent="center"
                                alignItems="center"
                            >
                                <Button
                                    variant="contained"
                                    size="large"
                                    onClick={() => navigate('/register')}
                                    sx={{
                                        borderRadius: 3,
                                        px: 4,
                                        py: 1.5,
                                        background: 'white',
                                        color: 'primary.main',
                                        fontSize: '1.1rem',
                                        fontWeight: 700,
                                        '&:hover': {
                                            background: '#f8fafc',
                                            transform: 'translateY(-2px)'
                                        }
                                    }}
                                >
                                    Start Your SCADA Journey
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="large"
                                    onClick={() => navigate('/login')}
                                    sx={{
                                        borderRadius: 3,
                                        px: 4,
                                        py: 1.5,
                                        borderColor: 'white',
                                        color: 'white',
                                        fontSize: '1.1rem',
                                        fontWeight: 600,
                                        '&:hover': {
                                            borderColor: 'white',
                                            background: 'rgba(255, 255, 255, 0.1)'
                                        }
                                    }}
                                >
                                    Sign In
                                </Button>
                            </Stack>
                        </Box>
                    </motion.div>
                </Container>
            </Box>

            {/* Footer */}
            <Box
                sx={{
                    py: 4,
                    background: '#1e293b',
                    color: 'white'
                }}
            >
                <Container maxWidth="lg">
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" sx={{ opacity: 0.7 }}>
                            © 2025 SCADA Platform. Built for the future of industrial automation.
                        </Typography>
                    </Box>
                </Container>
            </Box>
        </Box>
    );
}