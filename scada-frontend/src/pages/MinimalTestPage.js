// src/pages/MinimalTestPage.js - Absolutely minimal page
import React from 'react';
import { Box, Typography } from '@mui/material';

export default function MinimalTestPage() {
    console.log('🧪 MinimalTestPage rendered');

    return (
        <Box sx={{ p: 4 }}>
            <Typography variant="h4">
                🧪 Minimal Test Page
            </Typography>
            <Typography>
                This page has NO imports except React and MUI.
                If you get logged out here, the issue is in routing/auth, not API calls.
            </Typography>
            <Typography sx={{ mt: 2, color: 'primary.main' }}>
                Current time: {new Date().toLocaleString()}
            </Typography>
        </Box>
    );
}