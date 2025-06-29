// src/theme.js - Enhanced Professional SCADA Theme with Dark Mode
import { createTheme } from '@mui/material/styles';

// Professional gradient backgrounds (free to use)
export const backgrounds = {
    light: {
        default: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        primary: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        secondary: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
        canvas: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        sidebar: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        header: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        // Professional geometric patterns
        geometric: `
            linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%),
            radial-gradient(circle at 25% 25%, rgba(37, 99, 235, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(124, 58, 237, 0.05) 0%, transparent 50%)
        `,
        circuit: `
            linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%),
            repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(37, 99, 235, 0.03) 2px, rgba(37, 99, 235, 0.03) 4px)
        `,
        industrial: `
            linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%),
            repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(37, 99, 235, 0.02) 20px, rgba(37, 99, 235, 0.02) 21px)
        `
    },
    dark: {
        default: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        primary: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        secondary: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        canvas: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        sidebar: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        header: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        // Dark mode geometric patterns
        geometric: `
            linear-gradient(135deg, #0f172a 0%, #1e293b 100%),
            radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(168, 85, 247, 0.1) 0%, transparent 50%)
        `,
        circuit: `
            linear-gradient(135deg, #0f172a 0%, #1e293b 100%),
            repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(59, 130, 246, 0.05) 2px, rgba(59, 130, 246, 0.05) 4px)
        `,
        industrial: `
            linear-gradient(135deg, #0f172a 0%, #1e293b 100%),
            repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(59, 130, 246, 0.03) 20px, rgba(59, 130, 246, 0.03) 21px)
        `
    }
};

// Create theme function
export const createAppTheme = (mode = 'light', backgroundStyle = 'default') => {
    const isLight = mode === 'light';

    return createTheme({
        palette: {
            mode,
            primary: {
                main: isLight ? '#2563eb' : '#3b82f6',
                light: isLight ? '#60a5fa' : '#93c5fd',
                dark: isLight ? '#1d4ed8' : '#1e40af',
                contrastText: '#ffffff'
            },
            secondary: {
                main: isLight ? '#7c3aed' : '#a855f7',
                light: isLight ? '#a78bfa' : '#c084fc',
                dark: isLight ? '#5b21b6' : '#7c3aed',
                contrastText: '#ffffff'
            },
            background: {
                default: isLight ? '#f8fafc' : '#0f172a',
                paper: isLight ? '#ffffff' : '#1e293b'
            },
            text: {
                primary: isLight ? '#1e293b' : '#f1f5f9',
                secondary: isLight ? '#64748b' : '#94a3b8'
            },
            success: {
                main: isLight ? '#10b981' : '#34d399',
                light: isLight ? '#34d399' : '#6ee7b7',
                dark: isLight ? '#059669' : '#10b981'
            },
            warning: {
                main: isLight ? '#f59e0b' : '#fbbf24',
                light: isLight ? '#fbbf24' : '#fcd34d',
                dark: isLight ? '#d97706' : '#f59e0b'
            },
            error: {
                main: isLight ? '#ef4444' : '#f87171',
                light: isLight ? '#f87171' : '#fca5a5',
                dark: isLight ? '#dc2626' : '#ef4444'
            },
            info: {
                main: isLight ? '#0ea5e9' : '#38bdf8',
                light: isLight ? '#38bdf8' : '#7dd3fc',
                dark: isLight ? '#0284c7' : '#0ea5e9'
            },
            grey: isLight ? {
                50: '#f8fafc',
                100: '#f1f5f9',
                200: '#e2e8f0',
                300: '#cbd5e1',
                400: '#94a3b8',
                500: '#64748b',
                600: '#475569',
                700: '#334155',
                800: '#1e293b',
                900: '#0f172a'
            } : {
                50: '#0f172a',
                100: '#1e293b',
                200: '#334155',
                300: '#475569',
                400: '#64748b',
                500: '#94a3b8',
                600: '#cbd5e1',
                700: '#e2e8f0',
                800: '#f1f5f9',
                900: '#f8fafc'
            },
            // Custom SCADA colors
            scada: {
                online: isLight ? '#10b981' : '#34d399',
                offline: isLight ? '#6b7280' : '#9ca3af',
                warning: isLight ? '#f59e0b' : '#fbbf24',
                error: isLight ? '#ef4444' : '#f87171',
                flow: isLight ? '#0ea5e9' : '#38bdf8'
            }
        },
        typography: {
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
            h1: {
                fontSize: '2.5rem',
                fontWeight: 800,
                letterSpacing: '-0.025em',
                lineHeight: 1.2,
                color: isLight ? '#1e293b' : '#f1f5f9'
            },
            h2: {
                fontSize: '2rem',
                fontWeight: 700,
                letterSpacing: '-0.025em',
                lineHeight: 1.3,
                color: isLight ? '#1e293b' : '#f1f5f9'
            },
            h3: {
                fontSize: '1.5rem',
                fontWeight: 600,
                letterSpacing: '-0.025em',
                lineHeight: 1.4,
                color: isLight ? '#1e293b' : '#f1f5f9'
            },
            h4: {
                fontSize: '1.25rem',
                fontWeight: 600,
                letterSpacing: '-0.025em',
                lineHeight: 1.4,
                color: isLight ? '#1e293b' : '#f1f5f9'
            },
            h5: {
                fontSize: '1.125rem',
                fontWeight: 600,
                lineHeight: 1.5,
                color: isLight ? '#1e293b' : '#f1f5f9'
            },
            h6: {
                fontSize: '1rem',
                fontWeight: 600,
                lineHeight: 1.5,
                color: isLight ? '#1e293b' : '#f1f5f9'
            },
            body1: {
                fontSize: '1rem',
                lineHeight: 1.6,
                color: isLight ? '#374151' : '#d1d5db'
            },
            body2: {
                fontSize: '0.875rem',
                lineHeight: 1.5,
                color: isLight ? '#6b7280' : '#9ca3af'
            },
            button: {
                textTransform: 'none',
                fontWeight: 600,
                letterSpacing: '0.025em'
            }
        },
        shape: {
            borderRadius: 12
        },
        shadows: isLight ? [
            'none',
            '0 1px 2px 0 rgb(0 0 0 / 0.05)',
            '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
            '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
            '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
            '0 25px 50px -12px rgb(0 0 0 / 0.25)',
            '0 25px 50px -12px rgb(0 0 0 / 0.25)',
            '0 25px 50px -12px rgb(0 0 0 / 0.25)',
            '0 25px 50px -12px rgb(0 0 0 / 0.25)',
            '0 25px 50px -12px rgb(0 0 0 / 0.25)',
            '0 25px 50px -12px rgb(0 0 0 / 0.25)',
            '0 25px 50px -12px rgb(0 0 0 / 0.25)',
            '0 25px 50px -12px rgb(0 0 0 / 0.25)',
            '0 25px 50px -12px rgb(0 0 0 / 0.25)',
            '0 25px 50px -12px rgb(0 0 0 / 0.25)',
            '0 25px 50px -12px rgb(0 0 0 / 0.25)',
            '0 25px 50px -12px rgb(0 0 0 / 0.25)',
            '0 25px 50px -12px rgb(0 0 0 / 0.25)',
            '0 25px 50px -12px rgb(0 0 0 / 0.25)',
            '0 25px 50px -12px rgb(0 0 0 / 0.25)',
            '0 25px 50px -12px rgb(0 0 0 / 0.25)',
            '0 25px 50px -12px rgb(0 0 0 / 0.25)',
            '0 25px 50px -12px rgb(0 0 0 / 0.25)',
            '0 25px 50px -12px rgb(0 0 0 / 0.25)'
        ] : [
            'none',
            '0 1px 2px 0 rgb(0 0 0 / 0.3)',
            '0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.4)',
            '0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.4)',
            '0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.4)',
            '0 20px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.4)',
            '0 25px 50px -12px rgb(0 0 0 / 0.6)',
            '0 25px 50px -12px rgb(0 0 0 / 0.6)',
            '0 25px 50px -12px rgb(0 0 0 / 0.6)',
            '0 25px 50px -12px rgb(0 0 0 / 0.6)',
            '0 25px 50px -12px rgb(0 0 0 / 0.6)',
            '0 25px 50px -12px rgb(0 0 0 / 0.6)',
            '0 25px 50px -12px rgb(0 0 0 / 0.6)',
            '0 25px 50px -12px rgb(0 0 0 / 0.6)',
            '0 25px 50px -12px rgb(0 0 0 / 0.6)',
            '0 25px 50px -12px rgb(0 0 0 / 0.6)',
            '0 25px 50px -12px rgb(0 0 0 / 0.6)',
            '0 25px 50px -12px rgb(0 0 0 / 0.6)',
            '0 25px 50px -12px rgb(0 0 0 / 0.6)',
            '0 25px 50px -12px rgb(0 0 0 / 0.6)',
            '0 25px 50px -12px rgb(0 0 0 / 0.6)',
            '0 25px 50px -12px rgb(0 0 0 / 0.6)',
            '0 25px 50px -12px rgb(0 0 0 / 0.6)',
            '0 25px 50px -12px rgb(0 0 0 / 0.6)',
            '0 25px 50px -12px rgb(0 0 0 / 0.6)'
        ],
        components: {
            MuiButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 10,
                        padding: '10px 24px',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        boxShadow: 'none',
                        '&:hover': {
                            boxShadow: isLight
                                ? '0 4px 12px rgb(0 0 0 / 0.15)'
                                : '0 4px 12px rgb(0 0 0 / 0.3)'
                        }
                    },
                    contained: {
                        background: isLight
                            ? 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)'
                            : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        '&:hover': {
                            background: isLight
                                ? 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)'
                                : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                        }
                    },
                    outlined: {
                        borderColor: isLight ? '#e2e8f0' : '#475569',
                        color: isLight ? '#374151' : '#d1d5db',
                        '&:hover': {
                            borderColor: isLight ? '#2563eb' : '#3b82f6',
                            backgroundColor: isLight ? 'rgba(37, 99, 235, 0.04)' : 'rgba(59, 130, 246, 0.08)'
                        }
                    }
                }
            },
            MuiPaper: {
                styleOverrides: {
                    root: {
                        borderRadius: 16,
                        border: isLight ? '1px solid #e2e8f0' : '1px solid #475569',
                        backgroundImage: 'none',
                        backgroundColor: isLight ? '#ffffff' : '#1e293b'
                    }
                }
            },
            MuiFab: {
                styleOverrides: {
                    root: {
                        borderRadius: 16,
                        background: isLight
                            ? 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)'
                            : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        '&:hover': {
                            background: isLight
                                ? 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)'
                                : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                        }
                    }
                }
            },
            MuiTextField: {
                styleOverrides: {
                    root: {
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 12,
                            backgroundColor: isLight ? '#f8fafc' : '#334155',
                            '& fieldset': {
                                borderColor: isLight ? '#e2e8f0' : '#475569'
                            },
                            '&:hover fieldset': {
                                borderColor: isLight ? '#2563eb' : '#3b82f6'
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: isLight ? '#2563eb' : '#3b82f6',
                                borderWidth: 2
                            }
                        },
                        '& .MuiInputLabel-root': {
                            color: isLight ? '#64748b' : '#94a3b8'
                        },
                        '& .MuiOutlinedInput-input': {
                            color: isLight ? '#1e293b' : '#f1f5f9'
                        }
                    }
                }
            },
            MuiChip: {
                styleOverrides: {
                    root: {
                        borderRadius: 8,
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        backgroundColor: isLight ? '#f1f5f9' : '#334155',
                        color: isLight ? '#374151' : '#d1d5db',
                        '&.MuiChip-colorPrimary': {
                            backgroundColor: isLight ? '#dbeafe' : '#1e3a8a',
                            color: isLight ? '#1e40af' : '#93c5fd'
                        },
                        '&.MuiChip-colorSecondary': {
                            backgroundColor: isLight ? '#ede9fe' : '#581c87',
                            color: isLight ? '#7c2d12' : '#c4b5fd'
                        }
                    }
                }
            },
            MuiCard: {
                styleOverrides: {
                    root: {
                        borderRadius: 16,
                        border: isLight ? '1px solid #e2e8f0' : '1px solid #475569',
                        backgroundColor: isLight ? '#ffffff' : '#1e293b',
                        boxShadow: isLight
                            ? '0 1px 3px 0 rgb(0 0 0 / 0.1)'
                            : '0 1px 3px 0 rgb(0 0 0 / 0.3)',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                            boxShadow: isLight
                                ? '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
                                : '0 10px 25px -5px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3)',
                            transform: 'translateY(-2px)'
                        }
                    }
                }
            },
            MuiDrawer: {
                styleOverrides: {
                    paper: {
                        background: backgrounds[mode].sidebar,
                        borderRight: isLight ? '1px solid #e2e8f0' : '1px solid #475569'
                    }
                }
            },
            MuiAppBar: {
                styleOverrides: {
                    root: {
                        background: backgrounds[mode].header,
                        borderBottom: isLight ? '1px solid #e2e8f0' : '1px solid #475569'
                    }
                }
            }
        },
        // Custom properties for backgrounds
        customBackgrounds: backgrounds[mode]
    });
};

// Export default light theme for backwards compatibility
export default createAppTheme('light', 'default');