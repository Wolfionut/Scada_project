import React from "react";
import { Navigate } from "react-router-dom";
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    // Show loading while checking authentication
    if (loading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
            >
                <CircularProgress size={60} sx={{ color: 'white', mb: 2 }} />
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                    Loading...
                </Typography>
            </Box>
        );
    }

    return user ? children : <Navigate to="/login" />;
}