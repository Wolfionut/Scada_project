// src/App.js - RESTORED ORIGINAL STRUCTURE
import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { ThemeProvider as MuiThemeProvider, CssBaseline } from "@mui/material";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { createAppTheme } from "./theme";
import { useTheme } from "./context/ThemeContext";
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
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";

function ProjectLayout() {
    const { isDark } = useTheme();

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
            </div>
        </div>
    );
}

function AppContent() {
    const { mode, backgroundStyle } = useTheme();
    const theme = createAppTheme(mode, backgroundStyle);

    return (
        <MuiThemeProvider theme={theme}>
            <CssBaseline />
            <BrowserRouter>
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

                    {/* All project context pages with sidebar */}
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
        </MuiThemeProvider>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <AppContent />
            </ThemeProvider>
        </AuthProvider>
    );
}