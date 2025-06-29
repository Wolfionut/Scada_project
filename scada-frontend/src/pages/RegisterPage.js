// src/pages/RegisterPage.js - SCADA Registration (Improved Layout)
import React, { useState } from 'react';
import {
    Box, Typography, TextField, Button, Card, CardContent, Container,
    Avatar, Divider, Link, Alert, IconButton, InputAdornment,
    FormControlLabel, Checkbox, CircularProgress, LinearProgress, Grid,
    FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import {
    PersonAdd as PersonAddIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    Email as EmailIcon,
    Lock as LockIcon,
    Person as PersonIcon,
    AccountCircle as AccountCircleIcon,
    ArrowBack as ArrowBackIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Security as SecurityIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from '../api/axios';

const PasswordStrengthIndicator = ({ password }) => {
    const getStrength = (password) => {
        let score = 0;
        if (password.length >= 8) score += 25;
        if (/[a-z]/.test(password)) score += 25;
        if (/[A-Z]/.test(password)) score += 25;
        if (/[0-9]/.test(password)) score += 25;
        return score;
    };

    const strength = getStrength(password);
    const getColor = () => {
        if (strength < 25) return 'error';
        if (strength < 50) return 'warning';
        if (strength < 75) return 'info';
        return 'success';
    };

    const getLabel = () => {
        if (strength < 25) return 'Weak';
        if (strength < 50) return 'Fair';
        if (strength < 75) return 'Good';
        return 'Strong';
    };

    if (!password) return null;

    return (
        <Box sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                    Password strength:
                </Typography>
                <Typography variant="caption" color={`${getColor()}.main`} sx={{ fontWeight: 600 }}>
                    {getLabel()}
                </Typography>
            </Box>
            <LinearProgress
                variant="determinate"
                value={strength}
                color={getColor()}
                sx={{ height: 4, borderRadius: 2 }}
            />
        </Box>
    );
};

const ValidationItem = ({ isValid, text }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        {isValid ? (
            <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
        ) : (
            <CancelIcon sx={{ fontSize: 16, color: 'error.main' }} />
        )}
        <Typography variant="caption" color={isValid ? 'success.main' : 'error.main'}>
            {text}
        </Typography>
    </Box>
);

export default function RegisterPage() {
    const navigate = useNavigate();

    // Form state - matching database schema
    const [username, setUsername] = useState('');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('operator');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [agreeTerms, setAgreeTerms] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Validation state
    const [errors, setErrors] = useState({});

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validateUsername = (username) => {
        // Username should be alphanumeric, underscores, hyphens, 3-50 chars
        const usernameRegex = /^[a-zA-Z0-9_-]{3,50}$/;
        return usernameRegex.test(username);
    };

    const validatePassword = (password) => {
        return {
            length: password.length >= 8,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            number: /[0-9]/.test(password)
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setErrors({});

        // Validation
        const newErrors = {};

        if (!username.trim()) {
            newErrors.username = 'Username is required';
        } else if (!validateUsername(username)) {
            newErrors.username = 'Username must be 3-50 characters and contain only letters, numbers, underscores, or hyphens';
        }

        if (!fullName.trim()) {
            newErrors.fullName = 'Full name is required';
        }

        if (email && !validateEmail(email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        if (!password) {
            newErrors.password = 'Password is required';
        } else {
            const validation = validatePassword(password);
            if (!validation.length || !validation.lowercase || !validation.uppercase || !validation.number) {
                newErrors.password = 'Password does not meet requirements';
            }
        }

        if (!confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (password !== confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        if (!agreeTerms) {
            newErrors.terms = 'You must agree to the terms and conditions';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);

        try {
            // Prepare payload matching database schema
            const payload = {
                username: username.trim(),
                password,
                full_name: fullName.trim(),
                role
            };

            // Only include email if provided
            if (email.trim()) {
                payload.email = email.trim();
            }

            await axios.post('/auth/register', payload);

            setSuccess(true);
            setTimeout(() => {
                navigate('/login', {
                    state: {
                        message: 'Registration successful! Please sign in with your new account.',
                        username: username
                    }
                });
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <Box
                sx={{
                    minHeight: '100vh',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 2
                }}
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <Card sx={{ p: 6, textAlign: 'center', borderRadius: 4 }}>
                        <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
                            Welcome to SCADA!
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Your account has been created successfully. Redirecting to login...
                        </Typography>
                        <CircularProgress sx={{ mt: 3 }} />
                    </Card>
                </motion.div>
            </Box>
        );
    }

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
                        <CardContent sx={{ p: { xs: 4, sm: 6 } }}>
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
                                        <PersonAddIcon fontSize="large" />
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
                                        color: 'transparent',
                                        fontSize: { xs: '1.8rem', sm: '2.125rem' }
                                    }}
                                >
                                    Create SCADA Account
                                </Typography>
                                <Typography variant="body1" color="text.secondary">
                                    Join the SCADA platform and start monitoring your systems
                                </Typography>
                            </Box>

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

                            {/* Registration Form */}
                            <form onSubmit={handleSubmit}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    {/* Account Information Section */}
                                    <Box>
                                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: 'text.primary' }}>
                                            Account Information
                                        </Typography>

                                        {/* Username and Role Row */}
                                        <Grid container spacing={2} sx={{ mb: 3 }}>
                                            <Grid item xs={12} sm={8}>
                                                <TextField
                                                    label="Username"
                                                    value={username}
                                                    onChange={(e) => {
                                                        setUsername(e.target.value);
                                                        setErrors(prev => ({ ...prev, username: '' }));
                                                    }}
                                                    error={!!errors.username}
                                                    helperText={errors.username || "3-50 characters, letters, numbers, underscore, hyphen"}
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
                                            </Grid>
                                            <Grid item xs={12} sm={4}>
                                                <FormControl fullWidth>
                                                    <InputLabel>Role</InputLabel>
                                                    <Select
                                                        value={role}
                                                        label="Role"
                                                        onChange={(e) => setRole(e.target.value)}
                                                        startAdornment={
                                                            <InputAdornment position="start">
                                                                <SecurityIcon color="primary" />
                                                            </InputAdornment>
                                                        }
                                                        sx={{
                                                            borderRadius: 2
                                                        }}
                                                    >
                                                        <MenuItem value="operator">Operator</MenuItem>
                                                        <MenuItem value="admin">Admin</MenuItem>
                                                    </Select>
                                                </FormControl>
                                            </Grid>
                                        </Grid>

                                        {/* Full Name */}
                                        <TextField
                                            label="Full Name"
                                            value={fullName}
                                            onChange={(e) => {
                                                setFullName(e.target.value);
                                                setErrors(prev => ({ ...prev, fullName: '' }));
                                            }}
                                            error={!!errors.fullName}
                                            helperText={errors.fullName}
                                            fullWidth
                                            autoComplete="name"
                                            sx={{ mb: 3 }}
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <PersonIcon color="primary" />
                                                    </InputAdornment>
                                                ),
                                            }}
                                        />

                                        {/* Email */}
                                        <TextField
                                            label="Email Address (Optional)"
                                            type="email"
                                            value={email}
                                            onChange={(e) => {
                                                setEmail(e.target.value);
                                                setErrors(prev => ({ ...prev, email: '' }));
                                            }}
                                            error={!!errors.email}
                                            helperText={errors.email}
                                            fullWidth
                                            autoComplete="email"
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <EmailIcon color="primary" />
                                                    </InputAdornment>
                                                ),
                                            }}
                                        />
                                    </Box>

                                    {/* Security Section */}
                                    <Box>
                                        <Divider sx={{ mb: 3 }} />
                                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: 'text.primary' }}>
                                            Security
                                        </Typography>

                                        {/* Password */}
                                        <TextField
                                            label="Password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => {
                                                setPassword(e.target.value);
                                                setErrors(prev => ({ ...prev, password: '' }));
                                            }}
                                            error={!!errors.password}
                                            helperText={errors.password}
                                            fullWidth
                                            autoComplete="new-password"
                                            sx={{ mb: 1 }}
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
                                                        >
                                                            {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                                        </IconButton>
                                                    </InputAdornment>
                                                ),
                                            }}
                                        />

                                        <PasswordStrengthIndicator password={password} />

                                        {password && (
                                            <Box sx={{ mt: 2, mb: 3 }}>
                                                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                                    Password requirements:
                                                </Typography>
                                                <Grid container spacing={1}>
                                                    <Grid item xs={6}>
                                                        <ValidationItem
                                                            isValid={password.length >= 8}
                                                            text="At least 8 characters"
                                                        />
                                                        <ValidationItem
                                                            isValid={/[A-Z]/.test(password)}
                                                            text="Uppercase letter"
                                                        />
                                                    </Grid>
                                                    <Grid item xs={6}>
                                                        <ValidationItem
                                                            isValid={/[a-z]/.test(password)}
                                                            text="Lowercase letter"
                                                        />
                                                        <ValidationItem
                                                            isValid={/[0-9]/.test(password)}
                                                            text="Number"
                                                        />
                                                    </Grid>
                                                </Grid>
                                            </Box>
                                        )}

                                        {/* Confirm Password */}
                                        <TextField
                                            label="Confirm Password"
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => {
                                                setConfirmPassword(e.target.value);
                                                setErrors(prev => ({ ...prev, confirmPassword: '' }));
                                            }}
                                            error={!!errors.confirmPassword}
                                            helperText={errors.confirmPassword}
                                            fullWidth
                                            autoComplete="new-password"
                                            InputProps={{
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <LockIcon color="primary" />
                                                    </InputAdornment>
                                                ),
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <IconButton
                                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                            edge="end"
                                                        >
                                                            {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                                        </IconButton>
                                                    </InputAdornment>
                                                ),
                                            }}
                                        />
                                    </Box>

                                    {/* Terms and Submit */}
                                    <Box>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={agreeTerms}
                                                    onChange={(e) => {
                                                        setAgreeTerms(e.target.checked);
                                                        setErrors(prev => ({ ...prev, terms: '' }));
                                                    }}
                                                    color="primary"
                                                />
                                            }
                                            label={
                                                <Typography variant="body2">
                                                    I agree to the{' '}
                                                    <Link href="#" sx={{ color: 'primary.main' }}>
                                                        Terms of Service
                                                    </Link>
                                                    {' '}and{' '}
                                                    <Link href="#" sx={{ color: 'primary.main' }}>
                                                        Privacy Policy
                                                    </Link>
                                                </Typography>
                                            }
                                            sx={{ mb: 2 }}
                                        />
                                        {errors.terms && (
                                            <Typography variant="caption" color="error.main" sx={{ display: 'block', mb: 2 }}>
                                                {errors.terms}
                                            </Typography>
                                        )}

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
                                                'Create Account'
                                            )}
                                        </Button>
                                    </Box>
                                </Box>
                            </form>

                            <Divider sx={{ my: 4 }}>
                                <Typography variant="body2" color="text.secondary">
                                    Already have an account?
                                </Typography>
                            </Divider>

                            {/* Login Link */}
                            <Box sx={{ textAlign: 'center' }}>
                                <Button
                                    variant="outlined"
                                    onClick={() => navigate('/login')}
                                    sx={{
                                        borderRadius: 2,
                                        px: 4,
                                        py: 1,
                                        fontWeight: 600
                                    }}
                                >
                                    Sign In Instead
                                </Button>
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