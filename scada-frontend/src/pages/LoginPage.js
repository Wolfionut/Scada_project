// src/pages/LoginPage.js - SCADA Authentication (Username/Password)
import React, { useState } from 'react';
import {
    Box, Typography, TextField, Button, Card, CardContent, Container,
    Avatar, Stack, Divider, Link, Alert, IconButton, InputAdornment,
    FormControlLabel, Checkbox, CircularProgress
} from '@mui/material';
import {
    Security as SecurityIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    AccountCircle as AccountCircleIcon,
    Lock as LockIcon,
    ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth(); // Add this line

    // Get success message from registration
    const registrationMessage = location.state?.message;
    const suggestedUsername = location.state?.username;

    // Form state - changed from email to username
    const [username, setUsername] = useState(suggestedUsername || '');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form validation
    const [usernameError, setUsernameError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const validateUsername = (username) => {
        // Username should be 3-50 characters, alphanumeric, underscore, hyphen
        const usernameRegex = /^[a-zA-Z0-9_-]{3,50}$/;
        return usernameRegex.test(username);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setUsernameError('');
        setPasswordError('');

        // Validation
        if (!username.trim()) {
            setUsernameError('Username is required');
            return;
        }
        if (!validateUsername(username.trim())) {
            setUsernameError('Username must be 3-50 characters and contain only letters, numbers, underscores, or hyphens');
            return;
        }
        if (!password) {
            setPasswordError('Password is required');
            return;
        }
        if (password.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            // Send username and password (matching database schema)
            const payload = {
                username: username.trim(),
                password
            };

            console.log('Sending login payload:', payload); // Debug log

            const response = await axios.post('/auth/login', payload);

            console.log('Login response:', response.data); // Debug log

            // Store token and user using AuthContext
            const token = response.data.token;
            const user = response.data.user;

            console.log('Using AuthContext login...');
            login(user, token, rememberMe);

            console.log('Login successful, navigating to projects...');
            navigate('/projects', { replace: true });
        } catch (err) {
            console.log('Login error details:', err.response?.data); // Debug log
            console.log('Full error:', err); // Debug log

            setError(err.response?.data?.message || 'Login failed. Please check your credentials and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2
            }}
        >
            {/* Background Pattern */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: `
                        radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%),
                        radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 0%, transparent 50%)
                    `,
                    zIndex: 0
                }}
            />

            <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <Card
                        elevation={24}
                        sx={{
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                            borderRadius: 4,
                            overflow: 'hidden',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}
                    >
                        <CardContent sx={{ p: 6 }}>
                            {/* Header */}
                            <Box sx={{ textAlign: 'center', mb: 4 }}>
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ duration: 0.5, delay: 0.2 }}
                                >
                                    <Avatar
                                        sx={{
                                            width: 80,
                                            height: 80,
                                            mx: 'auto',
                                            mb: 3,
                                            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                                            fontSize: '2rem',
                                            fontWeight: 800
                                        }}
                                    >
                                        <SecurityIcon fontSize="large" />
                                    </Avatar>
                                </motion.div>

                                <Typography
                                    variant="h4"
                                    sx={{
                                        fontWeight: 800,
                                        mb: 1,
                                        background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                                        backgroundClip: 'text',
                                        WebkitBackgroundClip: 'text',
                                        color: 'transparent'
                                    }}
                                >
                                    Welcome Back
                                </Typography>
                                <Typography variant="body1" color="text.secondary">
                                    Sign in to your SCADA platform account
                                </Typography>
                            </Box>

                            {/* Registration Success Message */}
                            {registrationMessage && (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                                        {registrationMessage}
                                    </Alert>
                                </motion.div>
                            )}

                            {/* Error Alert */}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                                        {error}
                                    </Alert>
                                </motion.div>
                            )}

                            {/* Login Form */}
                            <form onSubmit={handleSubmit}>
                                <Stack spacing={3}>
                                    <TextField
                                        label="Username"
                                        value={username}
                                        onChange={(e) => {
                                            setUsername(e.target.value);
                                            setUsernameError('');
                                            setError(''); // Clear general error when user types
                                        }}
                                        error={!!usernameError}
                                        helperText={usernameError || "Enter your username"}
                                        fullWidth
                                        autoComplete="username"
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <AccountCircleIcon color="primary" />
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2
                                            }
                                        }}
                                    />

                                    <TextField
                                        label="Password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            setPasswordError('');
                                            setError(''); // Clear general error when user types
                                        }}
                                        error={!!passwordError}
                                        helperText={passwordError}
                                        fullWidth
                                        autoComplete="current-password"
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <LockIcon color="primary" />
                                                </InputAdornment>
                                            ),
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        edge="end"
                                                        tabIndex={-1}
                                                    >
                                                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2
                                            }
                                        }}
                                    />

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={rememberMe}
                                                    onChange={(e) => setRememberMe(e.target.checked)}
                                                    color="primary"
                                                />
                                            }
                                            label="Remember me"
                                            sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.9rem' } }}
                                        />
                                        <Link
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                // TODO: Handle forgot password
                                                alert('Forgot password functionality will be implemented soon.');
                                            }}
                                            sx={{
                                                fontSize: '0.9rem',
                                                textDecoration: 'none',
                                                color: 'primary.main',
                                                '&:hover': { textDecoration: 'underline' }
                                            }}
                                        >
                                            Forgot Password?
                                        </Link>
                                    </Box>

                                    <Button
                                        type="submit"
                                        variant="contained"
                                        size="large"
                                        fullWidth
                                        disabled={loading}
                                        sx={{
                                            borderRadius: 2,
                                            py: 1.5,
                                            fontSize: '1.1rem',
                                            fontWeight: 700,
                                            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                                            '&:hover': {
                                                background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                                                transform: 'translateY(-1px)'
                                            },
                                            '&:disabled': {
                                                background: '#94a3b8'
                                            }
                                        }}
                                    >
                                        {loading ? (
                                            <CircularProgress size={24} color="inherit" />
                                        ) : (
                                            'Sign In'
                                        )}
                                    </Button>
                                </Stack>
                            </form>

                            <Divider sx={{ my: 4 }}>
                                <Typography variant="body2" color="text.secondary">
                                    OR
                                </Typography>
                            </Divider>
                            

                            {/* Register Link */}
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="body2" color="text.secondary">
                                    Don't have an account?{' '}
                                    <Link
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            navigate('/register');
                                        }}
                                        sx={{
                                            color: 'primary.main',
                                            textDecoration: 'none',
                                            fontWeight: 600,
                                            '&:hover': { textDecoration: 'underline' }
                                        }}
                                    >
                                        Create Account
                                    </Link>
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Back to Welcome */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                >
                    <Box sx={{ textAlign: 'center', mt: 3 }}>
                        <Button
                            startIcon={<ArrowBackIcon />}
                            onClick={() => navigate('/')}
                            sx={{
                                color: 'white',
                                '&:hover': {
                                    background: 'rgba(255, 255, 255, 0.1)'
                                }
                            }}
                        >
                            Back to Home
                        </Button>
                    </Box>
                </motion.div>
            </Container>
        </Box>
    );
}