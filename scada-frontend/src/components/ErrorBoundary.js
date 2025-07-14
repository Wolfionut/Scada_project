// src/components/ErrorBoundary.js - FIXED VERSION
import React from 'react';
import { Box, Typography, Button, Paper, Alert, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Refresh as RefreshIcon, Home as HomeIcon } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorDetails: null,
            retryCount: 0
        };
    }

    static getDerivedStateFromError(error) {
        // 🔧 CRITICAL FIX: Always return a valid state object
        console.error('🔧 ErrorBoundary: getDerivedStateFromError called:', error);

        return {
            hasError: true,
            error: error,
            errorInfo: null, // Will be set in componentDidCatch
            errorDetails: {
                message: error?.message || 'Unknown error',
                stack: error?.stack || 'No stack trace available',
                name: error?.name || 'Error',
                timestamp: new Date().toISOString()
            }
        };
    }

    componentDidCatch(error, errorInfo) {
        // 🔧 CRITICAL FIX: Safely update errorInfo
        console.error('🔧 ErrorBoundary: componentDidCatch called:', { error, errorInfo });

        this.setState(prevState => ({
            ...prevState,
            errorInfo: errorInfo || {
                componentStack: 'Component stack not available'
            },
            errorDetails: {
                ...prevState.errorDetails,
                componentStack: errorInfo?.componentStack || 'Component stack not available',
                errorBoundary: true
            }
        }));

        // Log to external service in production
        if (process.env.NODE_ENV === 'production') {
            // Example: logErrorToService(error, errorInfo);
            console.error('Production error logged:', { error, errorInfo });
        }
    }

    handleRetry = () => {
        console.log('🔄 ErrorBoundary: Retrying...');
        this.setState(prevState => ({
            hasError: false,
            error: null,
            errorInfo: null,
            errorDetails: null,
            retryCount: prevState.retryCount + 1
        }));
    };

    handleGoHome = () => {
        console.log('🏠 ErrorBoundary: Going home...');
        window.location.href = '/';
    };

    render() {
        // 🔧 CRITICAL FIX: Always check if state exists and has error
        if (!this.state) {
            console.error('🔧 ErrorBoundary: State is null, this should never happen');
            return (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h5" color="error" gutterBottom>
                        Critical Error: Error Boundary State is Null
                    </Typography>
                    <Button variant="contained" onClick={() => window.location.reload()}>
                        Reload Page
                    </Button>
                </Box>
            );
        }

        if (!this.state.hasError) {
            // 🔧 FIXED: Safely render children
            return this.props.children || null;
        }

        const { error, errorInfo, errorDetails, retryCount } = this.state;

        // 🔧 FIXED: Safe error rendering with fallbacks
        const errorMessage = error?.message || errorDetails?.message || 'An unexpected error occurred';
        const errorStack = error?.stack || errorDetails?.stack || 'No stack trace available';
        const componentStack = errorInfo?.componentStack || errorDetails?.componentStack || 'Component stack not available';

        return (
            <Box sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                p: 3
            }}>
                <Paper
                    elevation={3}
                    sx={{
                        maxWidth: 800,
                        width: '100%',
                        p: 4,
                        borderRadius: 3,
                        border: '1px solid #fca5a5'
                    }}
                >
                    {/* Header */}
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <Typography variant="h4" color="error" gutterBottom sx={{ fontWeight: 700 }}>
                            ⚠️ Application Error
                        </Typography>
                        <Typography variant="subtitle1" color="text.secondary">
                            The SCADA Diagram Editor encountered an unexpected error
                        </Typography>
                        {retryCount > 0 && (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                Retry attempt #{retryCount}
                            </Alert>
                        )}
                    </Box>

                    {/* Error Summary */}
                    <Alert severity="error" sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            Error: {errorMessage}
                        </Typography>
                        {errorDetails?.timestamp && (
                            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                Occurred at: {new Date(errorDetails.timestamp).toLocaleString()}
                            </Typography>
                        )}
                    </Alert>

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 3, justifyContent: 'center' }}>
                        <Button
                            variant="contained"
                            startIcon={<RefreshIcon />}
                            onClick={this.handleRetry}
                            sx={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                                }
                            }}
                        >
                            Try Again
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<HomeIcon />}
                            onClick={this.handleGoHome}
                            color="primary"
                        >
                            Go Home
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => window.location.reload()}
                            color="secondary"
                        >
                            Reload Page
                        </Button>
                    </Box>

                    {/* Error Details (Expandable) */}
                    {process.env.NODE_ENV === 'development' && (
                        <Accordion>
                            <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                sx={{ backgroundColor: '#f9fafb' }}
                            >
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                    🔧 Developer Details
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ backgroundColor: '#f3f4f6' }}>
                                <Box sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                        Error Stack:
                                    </Typography>
                                    <pre style={{
                                        whiteSpace: 'pre-wrap',
                                        backgroundColor: '#1f2937',
                                        color: '#f9fafb',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        fontSize: '0.75rem',
                                        overflow: 'auto',
                                        maxHeight: '200px'
                                    }}>
                                        {errorStack}
                                    </pre>

                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, mt: 2 }}>
                                        Component Stack:
                                    </Typography>
                                    <pre style={{
                                        whiteSpace: 'pre-wrap',
                                        backgroundColor: '#1f2937',
                                        color: '#f9fafb',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        fontSize: '0.75rem',
                                        overflow: 'auto',
                                        maxHeight: '200px'
                                    }}>
                                        {componentStack}
                                    </pre>

                                    {/* Additional Debug Info */}
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, mt: 2 }}>
                                        Debug Info:
                                    </Typography>
                                    <Box sx={{
                                        backgroundColor: '#1f2937',
                                        color: '#f9fafb',
                                        p: 1.5,
                                        borderRadius: 1,
                                        fontSize: '0.75rem'
                                    }}>
                                        <div>Error Name: {error?.name || 'Unknown'}</div>
                                        <div>Error Type: {typeof error}</div>
                                        <div>Has Error Info: {!!errorInfo}</div>
                                        <div>Retry Count: {retryCount}</div>
                                        <div>User Agent: {navigator.userAgent}</div>
                                        <div>URL: {window.location.href}</div>
                                    </Box>
                                </Box>
                            </AccordionDetails>
                        </Accordion>
                    )}

                    {/* User-Friendly Tips */}
                    <Box sx={{ mt: 3, p: 2, backgroundColor: '#f0f9ff', borderRadius: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                            💡 What you can try:
                        </Typography>
                        <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                            <li>Click "Try Again" to retry the operation</li>
                            <li>Refresh the page to reset the application</li>
                            <li>Check your internet connection</li>
                            <li>Clear your browser cache and cookies</li>
                            <li>Try using a different browser</li>
                        </ul>
                    </Box>
                </Paper>
            </Box>
        );
    }
}

export default ErrorBoundary;