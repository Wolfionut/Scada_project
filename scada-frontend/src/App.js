// src/App.js - ENHANCED WITH WEBSOCKET STATUS AND DEBUG INFO
import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { ThemeProvider as MuiThemeProvider, CssBaseline, Snackbar, Alert, Chip, Box } from "@mui/material";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AlarmSoundProvider } from "./context/AlarmSoundContext";
import { createAppTheme } from "./theme";
import { useTheme } from "./context/ThemeContext";
import { useGlobalWebSocket } from "./hooks/useWebSocket";
import WelcomePage from "./pages/WelcomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProjectsPage from "./pages/ProjectsPage";
import DevicesPage from "./pages/DevicesPage";
import TagsPage from "./pages/TagsPage";
import AlarmsPage from "./pages/AlarmsPage";
import LogsPage from "./pages/LogsPage";
import MeasurementsPage from "./pages/MeasurementsPage";
import DiagramEditorPage from "./pages/DiagramEditorPage";
import OperatorView from "./pages/OperatorView";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import GlobalAlarmSoundManager from "./components/GlobalAlarmSoundManager";

// Enhanced WebSocket Status Indicator
function WebSocketStatusIndicator() {
    const { isConnected, error, connectionAttempts } = useGlobalWebSocket();
    const { user } = useAuth();
    const [showStatus, setShowStatus] = React.useState(true);

    // Auto-hide status after successful connection
    React.useEffect(() => {
        if (isConnected && user) {
            const timer = setTimeout(() => setShowStatus(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [isConnected, user]);

    // Show status if there are issues or during initial connection
    if (!showStatus && isConnected && user) return null;

    const getStatusColor = () => {
        if (!user) return 'warning';
        if (error) return 'error';
        if (isConnected) return 'success';
        return 'info';
    };

    const getStatusText = () => {
        if (!user) return 'Not Authenticated';
        if (error) return `WebSocket Error: ${error}`;
        if (isConnected) return 'WebSocket Connected';
        if (connectionAttempts > 0) return `Connecting... (${connectionAttempts})`;
        return 'WebSocket Initializing';
    };

    return (
        <Box sx={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 9999
        }}>
            <Chip
                label={getStatusText()}
                color={getStatusColor()}
                variant="filled"
                size="small"
                sx={{
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    '& .MuiChip-label': {
                        px: 2
                    }
                }}
            />
        </Box>
    );
}

// Enhanced Project Layout with WebSocket Status
function ProjectLayout() {
    const { isDark } = useTheme();
    const { isConnected, error } = useGlobalWebSocket();
    const [showWebSocketError, setShowWebSocketError] = React.useState(false);

    // Show WebSocket errors in project context
    React.useEffect(() => {
        if (error) {
            setShowWebSocketError(true);
        }
    }, [error]);

    return (
        <div style={{ display: "flex" }}>
            <Sidebar />
            <div style={{
                flex: 1,
                marginLeft: 280,
                background: isDark ? '#0f172a' : '#f8fafc',
                minHeight: '100vh'
            }}>
                <Outlet />

                {/* WebSocket Status Indicator */}
                <WebSocketStatusIndicator />

                {/* WebSocket Error Snackbar */}
                <Snackbar
                    open={showWebSocketError && !!error}
                    autoHideDuration={6000}
                    onClose={() => setShowWebSocketError(false)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <Alert
                        severity="warning"
                        onClose={() => setShowWebSocketError(false)}
                        sx={{ width: '100%' }}
                    >
                        <strong>WebSocket Connection Issue:</strong> {error}
                        <br />
                        <small>Real-time data may not be available. Check server connection.</small>
                    </Alert>
                </Snackbar>
            </div>
        </div>
    );
}

// Enhanced App Content with Authentication Status
function AppContent() {
    const { mode, backgroundStyle } = useTheme();
    const { user, loading } = useAuth();
    const theme = createAppTheme(mode, backgroundStyle);

    // Debug authentication status
    React.useEffect(() => {
        console.log('🚀 App Authentication Status:', {
            user: !!user,
            username: user?.username,
            loading,
            hasToken: !!(localStorage.getItem('token') || sessionStorage.getItem('token'))
        });
    }, [user, loading]);

    return (
        <MuiThemeProvider theme={theme}>
            <CssBaseline />
            <AlarmSoundProvider>
                <BrowserRouter>
                    {/* Global Alarm Sound Manager */}
                    <GlobalAlarmSoundManager />

                    <Routes>
                        <Route path="/" element={<WelcomePage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />

                        {/* Public Projects List */}
                        <Route
                            path="/projects"
                            element={
                                <ProtectedRoute>
                                    <ProjectsPage />
                                </ProtectedRoute>
                            }
                        />

                        {/* All project context pages with sidebar and WebSocket status */}
                        <Route
                            path="/project/:projectId"
                            element={
                                <ProtectedRoute>
                                    <ProjectLayout />
                                </ProtectedRoute>
                            }
                        >
                            <Route path="devices" element={<DevicesPage />} />
                            <Route path="tags" element={<TagsPage />} />
                            <Route path="operator" element={<OperatorView />} />
                            <Route path="alarms" element={<AlarmsPage />} />
                            <Route path="logs" element={<LogsPage />} />
                            <Route path="diagram" element={<DiagramEditorPage />} />
                            <Route path="measurements" element={<MeasurementsPage />} />
                            <Route index element={<Navigate to="devices" />} />
                        </Route>

                        {/* Catch-all */}
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </BrowserRouter>
            </AlarmSoundProvider>
        </MuiThemeProvider>
    );
}

// Enhanced Main App Component
export default function App() {
    // Log app initialization
    React.useEffect(() => {
        console.log('🚀 SCADA Application Starting...');
        console.log('🔍 Environment:', process.env.NODE_ENV);
        console.log('🔍 WebSocket URL would be:',
            process.env.NODE_ENV === 'production'
                ? `wss://${window.location.host}/ws`
                : 'ws://localhost:4000/ws'
        );
    }, []);

    return (
        <AuthProvider>
            <ThemeProvider>
                <AppContent />
            </ThemeProvider>
        </AuthProvider>
    );
}