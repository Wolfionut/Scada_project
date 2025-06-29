import React, { useState } from 'react';
import {
    AppBar, Toolbar, Typography, IconButton, Box, Avatar, Menu, MenuItem, Paper
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onSidebarOpen }) {
    const { user, logout } = useAuth();
    const [anchorEl, setAnchorEl] = useState(null);

    return (
        <Paper
            elevation={4}
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1300,
                borderRadius: 0,
                background: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 32px rgba(60,70,120,0.13)'
            }}
        >
            <Toolbar>
                <Typography
                    variant="h5"
                    sx={{
                        fontWeight: 800,
                        letterSpacing: 1,
                        flexGrow: 1,
                        color: 'primary.dark'
                    }}
                >
                    SCADA Dashboard
                </Typography>
                {user && (
                    <Box>
                        <IconButton onClick={e => setAnchorEl(e.currentTarget)}>
                            <Avatar sx={{
                                bgcolor: 'primary.main',
                                color: '#fff'
                            }}>
                                {user.username[0]?.toUpperCase()}
                            </Avatar>
                        </IconButton>
                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={() => setAnchorEl(null)}
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        >
                            <MenuItem disabled>
                                {user.full_name || user.username}
                            </MenuItem>
                            <MenuItem onClick={() => { logout(); setAnchorEl(null); }}>Logout</MenuItem>
                        </Menu>
                    </Box>
                )}
            </Toolbar>
        </Paper>
    );
}
