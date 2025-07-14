// src/pages/DiagramEditorPage.js - COMPLETE FIXED VERSION
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box, Paper, Typography, IconButton, Button, Snackbar, Alert, Tooltip,
    Chip, Stack, Card, CardContent, Divider, Drawer, AppBar, Toolbar,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
    FormControl, InputLabel, Select, Switch, FormControlLabel, Tabs, Tab,
    List, ListItem, ListItemText, ListItemIcon, Accordion, AccordionSummary,
    AccordionDetails, Slider, Grid, Avatar, Badge, CircularProgress,
    Autocomplete
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Save as SaveIcon,
    Delete as DeleteIcon,
    Timeline as TimelineIcon,
    Settings as SettingsIcon,
    ZoomIn as ZoomInIcon,
    ZoomOut as ZoomOutIcon,
    Link as LinkIcon,
    Visibility as VisibilityIcon,
    Code as CodeIcon,
    Download as DownloadIcon,
    Upload as UploadIcon,
    Layers as LayersIcon,
    ExpandMore as ExpandMoreIcon,
    Label as LabelIcon,
    Memory as MemoryIcon,
    PlayArrow as PlayArrowIcon,
    Pause as PauseIcon,
    Wifi as WifiIcon,
    WifiOff as WifiOffIcon,
    Refresh as RefreshIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Warning as WarningIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    Speed as SpeedIcon,
    Circle as CircleIcon
} from '@mui/icons-material';
import axios from '../api/axios';

// Import Modern Symbols
import symbolList, { PipeComponent, statusTypes, sensorTypes } from '../symbols/symbolList';
import { motion } from 'framer-motion';

// Import your existing WebSocket hook
import { useRealTimeData } from '../hooks/useWebSocket';

// 🚀 PERFORMANCE FIX 1: Throttled console logging
const createThrottledLogger = () => {
    let lastLogTime = 0;
    const LOG_INTERVAL = 2000; // Only log every 2 seconds max

    return (message, data) => {
        const now = Date.now();
        if (process.env.NODE_ENV === 'development' && now - lastLogTime > LOG_INTERVAL) {
            console.log(message, data);
            lastLogTime = now;
        }
    };
};

const throttledLog = createThrottledLogger();

// Enhanced Snackbar Component
function ModernSnackbar({ open, onClose, message, severity = "success" }) {
    if (!open) return null;
    return (
        <Snackbar
            open={open}
            autoHideDuration={4000}
            onClose={onClose}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
            <Alert
                severity={severity}
                onClose={onClose}
                sx={{
                    borderRadius: 3,
                    fontWeight: 600,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    minWidth: 300
                }}
            >
                {message}
            </Alert>
        </Snackbar>
    );
}

// 🚀 PERFORMANCE FIX 2: More aggressive memoization for Properties Panel
const EnhancedElementPropertiesPanel = React.memo(function EnhancedElementPropertiesPanel({
                                                                                              selectedElement,
                                                                                              onUpdateElement,
                                                                                              tags,
                                                                                              measurements,
                                                                                              isConnected,
                                                                                              projectId,
                                                                                              getTagDataByName,
                                                                                              onSaveDiagram // 🚀 NEW: Save function for auto-save before linking
                                                                                          }) {
    const [linkedTag, setLinkedTag] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [color, setColor] = useState('#2563eb');
    const [sensorType, setSensorType] = useState('temperature');
    const [loading, setLoading] = useState(false);
    const [tagSuggestions, setTagSuggestions] = useState([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    // 🚀 PERFORMANCE FIX 3: Throttled updates
    const throttledUpdate = useCallback(
        (() => {
            let timeoutId = null;
            return (elementId, updatedData) => {
                if (timeoutId) clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    onUpdateElement(elementId, updatedData);
                }, 100); // Batch updates every 100ms
            };
        })(),
        [onUpdateElement]
    );

    useEffect(() => {
        if (selectedElement) {
            setLinkedTag(selectedElement.linkedTag || '');
            setDisplayName(selectedElement.displayName || selectedElement.name || '');
            setColor(selectedElement.color || '#2563eb');
            setSensorType(selectedElement.sensorType || 'temperature');

            // Only fetch suggestions if not already loaded
            if (tagSuggestions.length === 0) {
                fetchTagSuggestions();
            }
        }
    }, [selectedElement?.id]); // 🚀 Only depend on ID, not full object

    const fetchTagSuggestions = useCallback(async () => {
        if (!selectedElement || !projectId) return;

        try {
            setLoadingSuggestions(true);
            const elementType = selectedElement.key || selectedElement.type || 'sensor';

            try {
                const response = await axios.get(`/diagrams/project/${projectId}/tag-suggestions/${elementType}`);
                const suggestions = response.data.suggestions || [];
                setTagSuggestions(suggestions);

                if (suggestions.length === 0) {
                    throw new Error('No suggestions from endpoint');
                }
            } catch (suggestionsError) {
                // Fallback: Get all tags for the project
                const allTagsResponse = await axios.get(`/tags/project/${projectId}`);
                const allTags = allTagsResponse.data || [];

                const fallbackSuggestions = allTags.map(tag => ({
                    ...tag,
                    compatibility_score: getCompatibilityScore(tag, elementType),
                    suggestion_reason: getCompatibilityReason(tag, elementType),
                    is_linked: false,
                    current_value: null
                }));

                fallbackSuggestions.sort((a, b) => b.compatibility_score - a.compatibility_score);
                setTagSuggestions(fallbackSuggestions);
            }

        } catch (error) {
            console.error('❌ Failed to fetch tag data:', error);
            setTagSuggestions([]);
        } finally {
            setLoadingSuggestions(false);
        }
    }, [selectedElement?.key, projectId]); // 🚀 Reduced dependencies

    const getCompatibilityScore = useCallback((tag, elementType) => {
        const tagName = tag.tag_name?.toLowerCase() || '';
        const tagType = tag.tag_type?.toLowerCase() || '';

        let score = 50;

        switch (elementType) {
            case 'tank':
                if (tagName.includes('level') || tagName.includes('tank')) score += 30;
                if (tagType === 'analog') score += 10;
                break;
            case 'pump':
                if (tagName.includes('pump') || tagName.includes('speed') || tagName.includes('rpm')) score += 30;
                if (tagType === 'analog') score += 10;
                break;
            case 'valve':
                if (tagName.includes('valve') || tagName.includes('position')) score += 30;
                if (tagType === 'analog' || tagType === 'digital') score += 10;
                break;
            case 'sensor':
                if (tagName.includes('temp') || tagName.includes('pressure') || tagName.includes('sensor')) score += 30;
                if (tagType === 'analog') score += 15;
                break;
            case 'motor':
                if (tagName.includes('motor') || tagName.includes('rpm') || tagName.includes('speed')) score += 30;
                if (tagType === 'analog') score += 10;
                break;
        }

        return Math.min(score, 100);
    }, []);

    const getCompatibilityReason = useCallback((tag, elementType) => {
        const score = getCompatibilityScore(tag, elementType);
        if (score >= 80) return `Highly compatible with ${elementType}`;
        if (score >= 60) return `Good match for ${elementType}`;
        return `Available for linking to ${elementType}`;
    }, [getCompatibilityScore]);

    const handleLinkTag = useCallback(async () => {
        if (!selectedElement || !linkedTag || !projectId) return;

        try {
            setLoading(true);

            // 🚀 AUTO-SAVE DIAGRAM FIRST (Critical Fix!)
            console.log('🔗 Step 1: Auto-saving diagram before linking tag...');

            try {
                if (typeof onSaveDiagram === 'function') {
                    await onSaveDiagram(); // Auto-save the diagram first
                    console.log('✅ Step 1 Complete: Diagram auto-saved successfully');
                } else {
                    console.warn('⚠️ Step 1 Warning: No save function available, proceeding without save');
                }

                // Small delay to ensure database consistency
                await new Promise(resolve => setTimeout(resolve, 300));

            } catch (saveError) {
                console.error('❌ Step 1 Failed: Auto-save failed:', saveError);
                throw new Error(`Please save your diagram first: ${saveError.message}`);
            }

            // 🚀 Step 2: Now attempt to link the tag
            console.log('🔗 Step 2: Linking tag to element...');

            const response = await axios.post(
                `/diagrams/project/${projectId}/elements/${selectedElement.id}/link-tag`,
                {
                    tag_name: linkedTag,
                    display_settings: {
                        showValue: true,
                        showUnit: true,
                        showAlarmStatus: true
                    }
                }
            );

            console.log('✅ Step 2 Complete: Tag linked successfully');
            onUpdateElement(selectedElement.id, response.data.element);

        } catch (error) {
            console.error('❌ Failed to link tag:', error);

            // Enhanced error message based on error type
            let errorMessage = 'Failed to link tag';

            if (error.response?.status === 404) {
                errorMessage = '❌ Element not found in saved diagram. Please save your diagram first and try again.';
            } else if (error.message.includes('save')) {
                errorMessage = error.message;
            } else {
                errorMessage = `❌ ${error.response?.data?.error || error.message}`;
            }

            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [selectedElement?.id, linkedTag, projectId, onUpdateElement, onSaveDiagram]);

    const handleUnlinkTag = useCallback(async () => {
        if (!selectedElement || !projectId) return;

        try {
            setLoading(true);

            await axios.delete(
                `/diagrams/project/${projectId}/elements/${selectedElement.id}/unlink-tag`
            );

            onUpdateElement(selectedElement.id, {
                ...selectedElement,
                linkedTag: null,
                linkedTagId: null,
                realtime_data: null
            });

            setLinkedTag('');

        } catch (error) {
            console.error('❌ Failed to unlink tag:', error);
            alert(`Failed to unlink tag: ${error.response?.data?.error || error.message}`);
        } finally {
            setLoading(false);
        }
    }, [selectedElement?.id, projectId, onUpdateElement]);

    // 🚀 PERFORMANCE FIX 4: Memoized real-time value to prevent constant lookups
    const realTimeData = useMemo(() => {
        if (!selectedElement?.linkedTag || !getTagDataByName) return null;
        return getTagDataByName(selectedElement.linkedTag);
    }, [selectedElement?.linkedTag, getTagDataByName, measurements]); // Include measurements to trigger updates

    const formatValue = useCallback((value, unit, tagType) => {
        if (tagType === 'digital') {
            return value ? 'ON' : 'OFF';
        }
        if (typeof value === 'number') {
            return `${value.toFixed(2)} ${unit || ''}`;
        }
        return `${value} ${unit || ''}`;
    }, []);

    if (!selectedElement) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <SettingsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                    Select an element to configure properties and tag bindings
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                Element Properties
            </Typography>

            {/* Real-time Status */}
            <Card sx={{
                mb: 3,
                bgcolor: isConnected ? 'success.50' : 'error.50',
                border: `1px solid ${isConnected ? '#10b981' : '#ef4444'}`
            }}>
                <CardContent sx={{ p: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        {isConnected ?
                            <WifiIcon sx={{ color: 'success.main' }} /> :
                            <WifiOffIcon sx={{ color: 'error.main' }} />
                        }
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {isConnected ? 'Live Data Connected' : 'Offline Mode'}
                            </Typography>
                            {realTimeData && (
                                <Typography variant="body2" color="text.secondary">
                                    Current: {formatValue(realTimeData.value, realTimeData.engineering_unit || realTimeData.unit, realTimeData.tag_type)}
                                </Typography>
                            )}
                        </Box>
                        <Button
                            size="small"
                            onClick={fetchTagSuggestions}
                            disabled={loadingSuggestions}
                            startIcon={loadingSuggestions ? <CircularProgress size={16} /> : <RefreshIcon />}
                        >
                            Refresh
                        </Button>
                    </Stack>
                </CardContent>
            </Card>

            <Stack spacing={3}>
                {/* Element Info */}
                <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                        {selectedElement.displayName || selectedElement.name || selectedElement.id}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        <Chip
                            label={selectedElement.type || selectedElement.key}
                            size="small"
                            color="primary"
                        />
                        {selectedElement.linkedTag && (
                            <Chip
                                icon={<LinkIcon />}
                                label="Linked"
                                size="small"
                                color="success"
                            />
                        )}
                    </Stack>
                </Box>

                <Divider />

                {/* Tag Binding Section */}
                <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                        Tag Binding
                    </Typography>

                    {selectedElement.linkedTag ? (
                        // Currently linked
                        <Card sx={{
                            bgcolor: 'success.50',
                            border: '1px solid',
                            borderColor: 'success.200'
                        }}>
                            <CardContent sx={{ p: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <LinkIcon color="success" fontSize="small" />
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        Linked to: {selectedElement.linkedTag}
                                    </Typography>
                                </Box>

                                {realTimeData && (
                                    <Box sx={{ mb: 2, p: 2, bgcolor: 'success.100', borderRadius: 1 }}>
                                        <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.dark' }}>
                                            {formatValue(realTimeData.value, realTimeData.engineering_unit || realTimeData.unit, realTimeData.tag_type)}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Status: {realTimeData.quality || realTimeData.status || 'GOOD'} • Device: {realTimeData.device_name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Last Update: {realTimeData.timestamp ?
                                            new Date(realTimeData.timestamp).toLocaleTimeString() : 'Never'}
                                        </Typography>
                                    </Box>
                                )}

                                <Button
                                    size="small"
                                    onClick={handleUnlinkTag}
                                    disabled={loading}
                                    color="warning"
                                    startIcon={<DeleteIcon />}
                                >
                                    {loading ? 'Unlinking...' : 'Unlink Tag'}
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        // Not linked
                        <Card sx={{
                            bgcolor: 'warning.50',
                            border: '1px solid',
                            borderColor: 'warning.200'
                        }}>
                            <CardContent sx={{ p: 2 }}>
                                <Typography variant="body2" sx={{ mb: 2 }}>
                                    No tag linked to this element
                                </Typography>

                                {/* Auto-save Notice */}
                                <Box sx={{
                                    mb: 2,
                                    p: 1.5,
                                    bgcolor: 'info.50',
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'info.200'
                                }}>
                                    <Typography variant="caption" color="info.dark" sx={{ fontWeight: 600 }}>
                                        💾 Note: Your diagram will be automatically saved before linking tags
                                    </Typography>
                                </Box>

                                {/* Tag Selection with Suggestions */}
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                        Available Tags: {tagSuggestions.length} found
                                        {loadingSuggestions && ' (Loading...)'}
                                    </Typography>

                                    <Autocomplete
                                        options={tagSuggestions}
                                        getOptionLabel={(option) => option.tag_name || 'Unknown Tag'}
                                        value={tagSuggestions.find(t => t.tag_name === linkedTag) || null}
                                        onChange={(event, newValue) => {
                                            setLinkedTag(newValue ? newValue.tag_name : '');
                                        }}
                                        loading={loadingSuggestions}
                                        disabled={loading}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Select Tag"
                                                size="small"
                                                helperText={`${tagSuggestions.length} tags available`}
                                                InputProps={{
                                                    ...params.InputProps,
                                                    endAdornment: (
                                                        <>
                                                            {loadingSuggestions ? <CircularProgress color="inherit" size={20} /> : null}
                                                            {params.InputProps.endAdornment}
                                                        </>
                                                    ),
                                                }}
                                            />
                                        )}
                                        renderOption={(props, option) => (
                                            <Box component="li" {...props} key={option.tag_id || option.tag_name}>
                                                <Box sx={{ width: '100%' }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                            {option.tag_name}
                                                            {option.is_linked && ' (Already Linked)'}
                                                        </Typography>
                                                        <Chip
                                                            label={`${option.compatibility_score || 50}%`}
                                                            size="small"
                                                            color={
                                                                (option.compatibility_score || 50) > 80 ? 'success' :
                                                                    (option.compatibility_score || 50) > 60 ? 'warning' : 'default'
                                                            }
                                                        />
                                                    </Box>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {option.tag_type} • {option.device_name || 'Unknown Device'}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                        {option.suggestion_reason || 'Available for linking'}
                                                    </Typography>
                                                    {(option.current_value !== null && option.current_value !== undefined) && (
                                                        <Typography variant="caption" color="primary.main" sx={{ display: 'block' }}>
                                                            Current: {option.current_value} {option.engineering_unit || ''}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Box>
                                        )}
                                        noOptionsText={
                                            loadingSuggestions ? "Loading tags..." :
                                                "No tags found. Create tags in the Tags page first."
                                        }
                                        sx={{ mb: 1 }}
                                    />
                                </Box>

                                <Stack direction="row" spacing={1}>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={handleLinkTag}
                                        disabled={!linkedTag || loading || loadingSuggestions}
                                        startIcon={loading ? <CircularProgress size={16} /> : <LinkIcon />}
                                        sx={{ flex: 1 }}
                                    >
                                        {loading ? 'Auto-saving & Linking...' : 'Link Tag'}
                                    </Button>
                                </Stack>

                                {tagSuggestions.length === 0 && !loadingSuggestions && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                        No compatible tags found. Create tags in the Tags page first.
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </Box>

                <Divider />

                {/* Element Settings */}
                <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                        Display Settings
                    </Typography>

                    <Stack spacing={2}>
                        <TextField
                            label="Display Name"
                            value={displayName}
                            size="small"
                            fullWidth
                            onChange={(e) => {
                                setDisplayName(e.target.value);
                                throttledUpdate(selectedElement.id, {
                                    ...selectedElement,
                                    displayName: e.target.value
                                });
                            }}
                        />

                        <TextField
                            label="Color"
                            type="color"
                            value={color}
                            size="small"
                            fullWidth
                            onChange={(e) => {
                                setColor(e.target.value);
                                throttledUpdate(selectedElement.id, {
                                    ...selectedElement,
                                    color: e.target.value
                                });
                            }}
                        />

                        {selectedElement.key === 'sensor' && (
                            <FormControl fullWidth size="small">
                                <InputLabel>Sensor Type</InputLabel>
                                <Select
                                    value={sensorType}
                                    onChange={(e) => {
                                        setSensorType(e.target.value);
                                        throttledUpdate(selectedElement.id, {
                                            ...selectedElement,
                                            sensorType: e.target.value
                                        });
                                    }}
                                    label="Sensor Type"
                                >
                                    {Object.entries(sensorTypes).map(([key, type]) => (
                                        <MenuItem key={key} value={key}>
                                            {type.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}

                        <FormControlLabel
                            control={
                                <Switch
                                    defaultChecked={selectedElement.displaySettings?.showValue !== false}
                                    onChange={(e) => {
                                        throttledUpdate(selectedElement.id, {
                                            ...selectedElement,
                                            displaySettings: {
                                                ...selectedElement.displaySettings,
                                                showValue: e.target.checked
                                            }
                                        });
                                    }}
                                />
                            }
                            label="Show Real-time Value"
                        />

                        <FormControlLabel
                            control={
                                <Switch
                                    defaultChecked={selectedElement.displaySettings?.showAlarmStatus !== false}
                                    onChange={(e) => {
                                        throttledUpdate(selectedElement.id, {
                                            ...selectedElement,
                                            displaySettings: {
                                                ...selectedElement.displaySettings,
                                                showAlarmStatus: e.target.checked
                                            }
                                        });
                                    }}
                                />
                            }
                            label="Show Alarm Status"
                        />
                    </Stack>
                </Box>
            </Stack>
        </Box>
    );
}, (prevProps, nextProps) => {
    // 🚀 PERFORMANCE FIX 5: Better comparison function to prevent unnecessary re-renders
    const prevSelected = prevProps.selectedElement;
    const nextSelected = nextProps.selectedElement;

    if (prevSelected?.id !== nextSelected?.id) return false;
    if (prevSelected?.linkedTag !== nextSelected?.linkedTag) return false;
    if (prevProps.isConnected !== nextProps.isConnected) return false;
    if (prevProps.projectId !== nextProps.projectId) return false;
    if (prevProps.onSaveDiagram !== nextProps.onSaveDiagram) return false; // Check save function

    // Only check measurements for the linked tag, not all measurements
    const linkedTag = nextSelected?.linkedTag;
    if (linkedTag) {
        const prevMeasurement = prevProps.measurements[linkedTag];
        const nextMeasurement = nextProps.measurements[linkedTag];

        if (prevMeasurement?.value !== nextMeasurement?.value) return false;
        if (prevMeasurement?.timestamp !== nextMeasurement?.timestamp) return false;
    }

    return true;
});

// 🚀 PERFORMANCE FIX 6: Heavily optimized Tools Sidebar
const AdvancedToolsSidebar = React.memo(function AdvancedToolsSidebar({
                                                                          selectedElement,
                                                                          onAddSymbol,
                                                                          onPipeMode,
                                                                          isPipeMode,
                                                                          onDelete,
                                                                          deleteEnabled,
                                                                          onUpdateElement,
                                                                          tags,
                                                                          devices,
                                                                          measurements,
                                                                          isConnected,
                                                                          onExportTemplate,
                                                                          onImportTemplate,
                                                                          onLoadSaved,
                                                                          onNewDiagram,
                                                                          onSave,
                                                                          saving,
                                                                          projectId,
                                                                          getTagDataByName
                                                                      }) {
    const [activeTab, setActiveTab] = useState(0);

    return (
        <Drawer
            variant="permanent"
            anchor="right"
            sx={{
                width: 400,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: 400,
                    boxSizing: 'border-box',
                    background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                    borderLeft: '1px solid #e2e8f0',
                },
            }}
        >
            <Tabs
                value={activeTab}
                onChange={(e, newValue) => setActiveTab(newValue)}
                sx={{ borderBottom: '1px solid #e2e8f0' }}
            >
                <Tab label="Tools" />
                <Tab label="Properties" />
            </Tabs>

            {activeTab === 0 && (
                <Box sx={{ p: 2 }}>
                    {/* Save & Diagram Management */}
                    <Card sx={{ mb: 2, border: '2px solid #2563eb' }}>
                        <CardContent sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                                💾 Diagram Actions
                            </Typography>
                            <Stack spacing={2}>
                                <Button
                                    startIcon={<SaveIcon />}
                                    onClick={onSave}
                                    variant="contained"
                                    size="medium"
                                    fullWidth
                                    disabled={saving}
                                    sx={{
                                        background: saving
                                            ? 'linear-gradient(135deg, #64748b 0%, #475569 100%)'
                                            : 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                                        fontWeight: 700,
                                        py: 1.5,
                                        '&:hover': {
                                            background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)'
                                        }
                                    }}
                                >
                                    {saving ? 'Saving...' : 'Save to Database'}
                                </Button>
                                <Divider />
                                <Button
                                    startIcon={<VisibilityIcon />}
                                    onClick={onLoadSaved}
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                    color="primary"
                                >
                                    Load Saved
                                </Button>
                                <Button
                                    startIcon={<DownloadIcon />}
                                    onClick={onNewDiagram}
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                    color="info"
                                >
                                    New Diagram
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>

                    {/* Template Actions */}
                    <Card sx={{ mb: 2 }}>
                        <CardContent sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                📄 Template Library
                            </Typography>
                            <Stack spacing={1}>
                                <Button
                                    startIcon={<DownloadIcon />}
                                    onClick={onExportTemplate}
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                >
                                    Export Template
                                </Button>
                                <Button
                                    startIcon={<UploadIcon />}
                                    onClick={onImportTemplate}
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                >
                                    Import Template
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>

                    {/* Modern Symbol Library */}
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        🔧 Industrial Symbols
                    </Typography>
                    <Grid container spacing={1} sx={{ mb: 2 }}>
                        {symbolList.map(sym => (
                            <Grid item xs={6} key={sym.key}>
                                <Card
                                    sx={{
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease-in-out',
                                        border: '2px solid transparent',
                                        '&:hover': {
                                            borderColor: 'primary.main',
                                            boxShadow: 3,
                                            transform: 'translateY(-2px)'
                                        }
                                    }}
                                    onClick={() => onAddSymbol(sym.key)}
                                >
                                    <CardContent sx={{ p: 1.5, textAlign: 'center' }}>
                                        <sym.sidebarIcon width={28} height={28} status="online" />
                                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}>
                                            {sym.label}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>

                    {/* Drawing Tools */}
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        ⚡ Drawing Tools
                    </Typography>
                    <Stack spacing={1}>
                        <Button
                            variant={isPipeMode ? "contained" : "outlined"}
                            startIcon={<TimelineIcon />}
                            onClick={onPipeMode}
                            fullWidth
                            size="small"
                            sx={{
                                borderRadius: 2,
                                py: 1,
                                background: isPipeMode ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : undefined
                            }}
                        >
                            {isPipeMode ? 'Exit Pipe Mode' : 'Draw Pipes'}
                        </Button>
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={deleteEnabled ? onDelete : undefined}
                            disabled={!deleteEnabled}
                            fullWidth
                            size="small"
                            sx={{ borderRadius: 2, py: 1 }}
                        >
                            Delete Selected
                        </Button>
                    </Stack>
                </Box>
            )}

            {activeTab === 1 && (
                <EnhancedElementPropertiesPanel
                    selectedElement={selectedElement}
                    onUpdateElement={onUpdateElement}
                    tags={tags}
                    measurements={measurements}
                    isConnected={isConnected}
                    projectId={projectId}
                    getTagDataByName={getTagDataByName}
                    onSaveDiagram={onSave} // 🚀 Pass save function for auto-save before linking
                />
            )}
        </Drawer>
    );
}, (prevProps, nextProps) => {
    // Only re-render if critical props change
    return (
        prevProps.selectedElement?.id === nextProps.selectedElement?.id &&
        prevProps.isPipeMode === nextProps.isPipeMode &&
        prevProps.deleteEnabled === nextProps.deleteEnabled &&
        prevProps.isConnected === nextProps.isConnected &&
        prevProps.saving === nextProps.saving &&
        prevProps.projectId === nextProps.projectId
    );
});

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;

export default function DiagramEditorPage() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const stageRef = useRef();

    // Use your existing WebSocket hook
    const {
        measurements,
        isConnected,
        getTagValue,
        getTagTimestamp,
        connectionAttempts,
        error,
        getTagValueByName,
        getTagDataByName,
        getTagTimestampByName,
        requestDiagramData
    } = useRealTimeData(projectId);

    // State
    const [elements, setElements] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [isPipeMode, setIsPipeMode] = useState(false);
    const [pipePoints, setPipePoints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
    const [zoom, setZoom] = useState(1);
    const [tags, setTags] = useState([]);
    const [devices, setDevices] = useState([]);

    // 🚀 PERFORMANCE FIX 7: Debounced measurements to prevent excessive updates
    const [debouncedMeasurements, setDebouncedMeasurements] = useState({});

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDebouncedMeasurements(measurements);
        }, 200); // Update UI at most every 200ms

        return () => clearTimeout(timeoutId);
    }, [measurements]);

    // Load diagram, tags, and devices
    useEffect(() => {
        if (!projectId) return;

        throttledLog('📊 Loading diagram for project:', projectId);

        // Request real-time diagram data if connected
        if (isConnected && requestDiagramData) {
            setTimeout(() => {
                try {
                    requestDiagramData(projectId);
                } catch (error) {
                    console.log('⚠️ Diagram real-time data not supported by server');
                }
            }, 2000);
        }

        // Load diagram
        setLoading(true);
        axios.get(`/diagrams/project/${projectId}`)
            .then(res => {
                let diagramData = [];
                if (res.data.diagram_json) {
                    if (typeof res.data.diagram_json === 'string') {
                        try {
                            diagramData = JSON.parse(res.data.diagram_json);
                        } catch (e) {
                            console.error('❌ Error parsing diagram JSON:', e);
                            diagramData = [];
                        }
                    } else if (Array.isArray(res.data.diagram_json)) {
                        diagramData = res.data.diagram_json;
                    }
                }

                setElements(diagramData);
                setLoading(false);
            })
            .catch(err => {
                console.error('❌ Error loading diagram:', err);
                setLoading(false);
                setSnackbar({ open: true, message: "Failed to load diagram", severity: "error" });
            });

        // Load devices and tags for data binding
        axios.get(`/devices/project/${projectId}`)
            .then(res => {
                setDevices(res.data);
                const tagPromises = res.data.map(device =>
                    axios.get(`/tags/device/${device.device_id}`)
                );
                return Promise.all(tagPromises);
            })
            .then(tagResponses => {
                const allTags = tagResponses.flatMap(response => response.data);
                setTags(allTags);
            })
            .catch(err => {
                console.error('❌ Error loading project data:', err);
                setSnackbar({ open: true, message: "Failed to load project data", severity: "error" });
            });
    }, [projectId, isConnected, requestDiagramData]);

    // 🚀 PERFORMANCE FIX 8: Optimized device status calculation
    const getDeviceStatus = useCallback((element) => {
        if (!isConnected) return 'offline';
        if (!element.linkedTag) return element.status || 'online';

        const measurementData = getTagDataByName(element.linkedTag);
        if (!measurementData) return 'warning';
        if (measurementData.quality === 'good' || measurementData.status === 'GOOD') return 'online';
        return 'error';
    }, [isConnected, getTagDataByName]);

    // 🚀 PERFORMANCE FIX 9: Optimized device data with minimal recalculation
    const getDeviceData = useCallback((element) => {
        const baseData = {
            connected: isConnected && element.linkedTag ? !!getTagValueByName(element.linkedTag) : isConnected,
            status: getDeviceStatus(element)
        };

        if (!element.linkedTag) return baseData;

        const measurementData = getTagDataByName(element.linkedTag);
        const tagValue = measurementData?.value;

        switch (element.key) {
            case 'tank':
                return { ...baseData, fillLevel: tagValue !== undefined ? tagValue : element.fillLevel || 75 };
            case 'pump':
                return { ...baseData, speed: tagValue !== undefined ? tagValue : element.speed || 1450 };
            case 'valve':
                return { ...baseData, position: tagValue !== undefined ? tagValue : element.position || 100 };
            case 'motor':
                return { ...baseData, rpm: tagValue !== undefined ? tagValue : element.rpm || 1450 };
            case 'sensor':
                return {
                    ...baseData,
                    value: tagValue,
                    unit: measurementData?.engineering_unit || '',
                    sensorType: element.sensorType || 'temperature'
                };
            case 'pipe':
                return { ...baseData, flowDirection: element.flowDirection || 'right' };
            default:
                return baseData;
        }
    }, [isConnected, getTagValueByName, getTagDataByName, getDeviceStatus]);

    // Add modern symbol with enhanced properties
    const handleAddSymbol = useCallback((key) => {
        const sym = symbolList.find(s => s.key === key);
        if (!sym) return;

        const id = `${key}_${Date.now()}_${Math.floor(Math.random() * 99999)}`;

        const newElement = {
            id,
            key,
            type: 'symbol',
            x: 100 + Math.random() * 400,
            y: 100 + Math.random() * 300,
            width: sym.width,
            height: sym.height,
            displayName: sym.label,
            color: '#2563eb',
            visible: true,
            linkedTag: null,
            ...sym.defaultProps,
            sensorType: sym.key === 'sensor' ? 'temperature' : undefined
        };

        setElements(prev => [...prev, newElement]);
        setSelectedId(id);
        setSnackbar({ open: true, message: `${sym.label} added to canvas`, severity: "success" });
    }, []);

    // Pipe mode handler
    const startPipeMode = useCallback(() => {
        setIsPipeMode(!isPipeMode);
        setPipePoints([]);
        setSelectedId(null);
    }, [isPipeMode]);

    // Canvas click handler
    const handleCanvasClick = useCallback((e) => {
        if (isPipeMode) {
            const clickedShape = e.target;
            const clickedId = clickedShape && clickedShape.getParent()
                ? clickedShape.getParent().attrs.id
                : clickedShape.attrs.id;

            const clicked = elements.find(el => el.type === 'symbol' && clickedId === el.id);

            if (clicked) {
                const centerX = clicked.x + clicked.width / 2;
                const centerY = clicked.y + clicked.height / 2;
                const newPoint = { x: centerX, y: centerY, id: clicked.id };
                const pts = [...pipePoints, newPoint];

                if (pts.length === 2) {
                    const newPipe = {
                        id: `pipe_${Date.now()}`,
                        type: 'connection',
                        points: pts,
                        color: '#2563eb',
                        status: 'online',
                        active: true
                    };
                    setElements(prev => [...prev, newPipe]);
                    setPipePoints([]);
                    setIsPipeMode(false);
                    setSnackbar({ open: true, message: "Pipe connection created", severity: "success" });
                } else {
                    setPipePoints(pts);
                }
            }
            return;
        }

        if (e.target === e.target.getStage()) {
            setSelectedId(null);
        }
    }, [isPipeMode, elements, pipePoints]);

    // Update element properties
    const handleUpdateElement = useCallback((elementId, updatedElement) => {
        setElements(prev =>
            prev.map(el => el.id === elementId ? updatedElement : el)
        );
        setSnackbar({ open: true, message: "Element updated", severity: "success" });
    }, []);

    // Drag handler
    const handleDrag = useCallback((id, newX, newY) => {
        setElements(prev =>
            prev.map(el =>
                el.id === id ? { ...el, x: newX, y: newY } : el
            )
        );
    }, []);

    // Save diagram to database
    const handleSave = useCallback(() => {
        if (!projectId) return;
        setSaving(true);

        const saveData = {
            diagram_json: elements,
            name: "Modern SCADA HMI",
            metadata: {
                version: "3.0",
                saved_at: new Date().toISOString(),
                elements_count: elements.length,
                has_data_bindings: elements.some(el => el.linkedTag),
                symbol_types: [...new Set(elements.map(el => el.key))],
                modern_symbols: true,
                real_time_enabled: isConnected,
                linked_elements: elements.filter(el => el.linkedTag).length
            }
        };

        return axios.post(`/diagrams/project/${projectId}`, saveData)
            .then(() => {
                setSaving(false);
                setSnackbar({
                    open: true,
                    message: `✅ Modern SCADA diagram saved! ${elements.length} elements, ${elements.filter(el => el.linkedTag).length} linked to tags.`,
                    severity: "success"
                });
                return true; // Indicate success
            })
            .catch(err => {
                console.error('❌ Save error:', err);
                setSaving(false);
                setSnackbar({ open: true, message: "Failed to save diagram", severity: "error" });
                throw err; // Re-throw for caller to handle
            });
    }, [projectId, elements, isConnected]);

    // Delete selected element
    const deleteSelected = useCallback(() => {
        if (!selectedId) return;
        const element = elements.find(el => el.id === selectedId);
        setElements(prev => prev.filter(el => el.id !== selectedId));
        setSelectedId(null);
        setSnackbar({ open: true, message: `${element?.displayName || 'Element'} deleted`, severity: "info" });
    }, [selectedId, elements]);

    // Export diagram as template
    const handleExportTemplate = useCallback(() => {
        const exportData = {
            diagram: elements.map(el => ({
                ...el,
                linkedTag: null,
                linkedTagId: null,
                realtime_data: null
            })),
            metadata: {
                version: "3.0",
                exported: new Date().toISOString(),
                project_id: projectId,
                type: "modern_scada_template",
                modern_symbols: true
            }
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `modern_scada_template_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        setSnackbar({ open: true, message: "Modern SCADA template exported successfully", severity: "success" });
    }, [elements, projectId]);

    // Import diagram template
    const handleImportTemplate = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        if (data.diagram && Array.isArray(data.diagram)) {
                            const templateElements = data.diagram.map(el => ({
                                ...el,
                                linkedTag: null,
                                id: el.type === 'symbol'
                                    ? `${el.key}_${Date.now()}_${Math.floor(Math.random() * 99999)}`
                                    : `pipe_${Date.now()}_${Math.floor(Math.random() * 99999)}`
                            }));

                            setElements(templateElements);
                            setSnackbar({
                                open: true,
                                message: `Modern template imported! ${templateElements.length} elements loaded.`,
                                severity: "success"
                            });
                        } else {
                            throw new Error("Invalid template format");
                        }
                    } catch (error) {
                        setSnackbar({ open: true, message: "Failed to import template", severity: "error" });
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }, []);

    // Load saved diagram
    const handleLoadSaved = useCallback(() => {
        if (!projectId) return;

        setLoading(true);
        axios.get(`/diagrams/project/${projectId}`)
            .then(res => {
                let diagramData = [];
                if (res.data.diagram_json) {
                    if (typeof res.data.diagram_json === 'string') {
                        try {
                            diagramData = JSON.parse(res.data.diagram_json);
                        } catch (e) {
                            console.error('Error parsing diagram JSON:', e);
                            diagramData = [];
                        }
                    } else if (Array.isArray(res.data.diagram_json)) {
                        diagramData = res.data.diagram_json;
                    }
                }

                setElements(diagramData);
                setLoading(false);
                setSnackbar({ open: true, message: "Saved diagram loaded", severity: "success" });
            })
            .catch(err => {
                console.error('Error loading diagram:', err);
                setLoading(false);
                setSnackbar({ open: true, message: "Failed to load saved diagram", severity: "error" });
            });
    }, [projectId]);

    // New diagram
    const handleNewDiagram = useCallback(() => {
        if (elements.length > 0) {
            const confirmed = window.confirm(
                "Are you sure you want to create a new diagram? Unsaved changes will be lost."
            );
            if (!confirmed) return;
        }

        setElements([]);
        setSelectedId(null);
        setPipePoints([]);
        setIsPipeMode(false);
        setSnackbar({ open: true, message: "New modern diagram created", severity: "info" });
    }, [elements.length]);

    // Update pipe connections when devices move
    useEffect(() => {
        setElements(prev => {
            const syms = {};
            prev.forEach(el => { if (el.type === 'symbol') syms[el.id] = el; });
            return prev.map(el => {
                if (el.type === 'connection' && Array.isArray(el.points)) {
                    const pts = el.points.map(pt => {
                        const sym = syms[pt.id];
                        if (sym) {
                            return {
                                ...pt,
                                x: sym.x + sym.width / 2,
                                y: sym.y + sym.height / 2,
                            };
                        }
                        return pt;
                    });
                    return { ...el, points: pts };
                }
                return el;
            });
        });
    }, [elements.filter(e => e.type === 'symbol').map(s => [s.x, s.y, s.id]).flat().join(',')]);

    // Selected element
    const selectedElement = useMemo(() => {
        return elements.find(el => el.id === selectedId);
    }, [elements, selectedId]);

    // 🚀 PERFORMANCE FIX 10: Heavily optimized element rendering with stricter dependencies
    const renderedElements = useMemo(() => {
        return elements.map(el => {
            if (el.visible === false) return null;

            if (el.type === 'symbol') {
                const sym = symbolList.find(s => s.key === el.key);
                if (!sym) {
                    console.warn('❌ Modern symbol not found for key:', el.key);
                    return null;
                }
                const Component = sym.icon;
                const deviceData = getDeviceData(el);

                return (
                    <Component
                        key={el.id}
                        id={el.id}
                        x={el.x}
                        y={el.y}
                        width={el.width}
                        height={el.height}
                        draggable
                        selected={selectedId === el.id}
                        onClick={() => setSelectedId(el.id)}
                        onTap={() => setSelectedId(el.id)}
                        onDragEnd={e => {
                            handleDrag(el.id, e.target.x(), e.target.y());
                        }}
                        // Modern symbol props with real-time data
                        active={deviceData.connected}
                        status={deviceData.status}
                        fillLevel={deviceData.fillLevel}
                        speed={deviceData.speed}
                        position={deviceData.position}
                        rpm={deviceData.rpm}
                        sensorType={el.sensorType}
                        value={deviceData.value}
                        unit={deviceData.unit}
                        color={el.color}
                        displayName={el.displayName}
                        showValue={el.displaySettings?.showValue !== false}
                        showAlarmStatus={el.displaySettings?.showAlarmStatus !== false}
                    />
                );
            }

            if (el.type === 'connection' && Array.isArray(el.points) && el.points.length === 2) {
                return (
                    <Line
                        key={el.id}
                        points={[
                            el.points[0].x, el.points[0].y,
                            el.points[1].x, el.points[1].y,
                        ]}
                        stroke={selectedId === el.id ? "#f59e0b" : (el.color || "#2563eb")}
                        strokeWidth={selectedId === el.id ? 8 : 6}
                        lineCap="round"
                        lineJoin="round"
                        onClick={() => setSelectedId(el.id)}
                    />
                );
            }
            return null;
        });
    }, [
        elements,
        selectedId,
        getDeviceData,
        handleDrag,
        debouncedMeasurements // 🚀 Use debounced measurements instead of direct measurements
    ]);

    // Render temp pipe preview
    const renderTempPipe = useCallback(() => {
        if (pipePoints.length === 1) {
            return (
                <Line
                    points={[
                        pipePoints[0].x,
                        pipePoints[0].y,
                        pipePoints[0].x + 70,
                        pipePoints[0].y + 20,
                    ]}
                    stroke="#10b981"
                    strokeWidth={4}
                    dash={[8, 8]}
                />
            );
        }
        return null;
    }, [pipePoints]);

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Top AppBar */}
            <AppBar
                position="static"
                elevation={0}
                sx={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    borderBottom: '1px solid #e2e8f0',
                    color: 'text.primary'
                }}
            >
                <Toolbar>
                    <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
                        <ArrowBackIcon />
                    </IconButton>

                    <Avatar sx={{
                        width: 32,
                        height: 32,
                        mr: 2,
                        background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)'
                    }}>
                        <CodeIcon fontSize="small" />
                    </Avatar>

                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1 }}>
                            Enhanced SCADA HMI Designer
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Industrial Process Monitoring with Tag Binding
                        </Typography>
                    </Box>

                    {/* Status Indicators */}
                    <Stack direction="row" spacing={2} sx={{ mr: 3 }}>
                        <Badge
                            badgeContent={elements.filter(el => el.linkedTag).length}
                            color="secondary"
                            showZero
                        >
                            <Chip
                                icon={<LayersIcon />}
                                label={`${elements.length} Elements`}
                                color="primary"
                                size="small"
                                sx={{ fontWeight: 600 }}
                            />
                        </Badge>
                        <Chip
                            icon={isConnected ? <WifiIcon /> : <WifiOffIcon />}
                            label={isConnected ? 'Live Data' : error ? `Error: ${error}` : 'Offline'}
                            color={isConnected ? 'success' : error ? 'error' : 'default'}
                            size="small"
                            sx={{ fontWeight: 600 }}
                        />
                        <Chip
                            icon={<MemoryIcon />}
                            label={`${Object.keys(debouncedMeasurements).length} Tags`}
                            color="info"
                            size="small"
                            sx={{ fontWeight: 600 }}
                        />
                    </Stack>

                    {/* Action Buttons */}
                    <Stack direction="row" spacing={1}>
                        <Tooltip title="Zoom In">
                            <IconButton
                                onClick={() => setZoom(prev => Math.min(prev + 0.1, 2))}
                                disabled={zoom >= 2}
                            >
                                <ZoomInIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Zoom Out">
                            <IconButton
                                onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.5))}
                                disabled={zoom <= 0.5}
                            >
                                <ZoomOutIcon />
                            </IconButton>
                        </Tooltip>
                        <Button
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={handleSave}
                            disabled={saving}
                            sx={{
                                borderRadius: 2,
                                background: saving
                                    ? 'linear-gradient(135deg, #64748b 0%, #475569 100%)'
                                    : 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)'
                                }
                            }}
                        >
                            {saving ? 'Saving...' : 'Save'}
                        </Button>
                    </Stack>
                </Toolbar>
            </AppBar>

            {/* Main Content Area */}
            <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Canvas Area */}
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                        p: 3
                    }}
                >
                    <Paper
                        elevation={3}
                        sx={{
                            width: CANVAS_WIDTH,
                            height: CANVAS_HEIGHT,
                            borderRadius: 3,
                            overflow: 'hidden',
                            border: selectedId ? '3px solid #2563eb' : '2px solid #e2e8f0',
                            position: 'relative',
                            transition: 'border-color 0.3s ease'
                        }}
                    >
                        {loading ? (
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
                                }}
                            >
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                >
                                    <SettingsIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                                </motion.div>
                                <Typography variant="h6" sx={{ ml: 2, color: 'text.secondary' }}>
                                    Loading enhanced SCADA diagram...
                                </Typography>
                            </Box>
                        ) : (
                            <Stage
                                width={CANVAS_WIDTH}
                                height={CANVAS_HEIGHT}
                                ref={stageRef}
                                onMouseDown={handleCanvasClick}
                                scaleX={zoom}
                                scaleY={zoom}
                                style={{
                                    background: '#ffffff',
                                    cursor: isPipeMode ? 'crosshair' : 'default'
                                }}
                            >
                                <Layer>
                                    {renderedElements}
                                    {renderTempPipe()}
                                </Layer>
                            </Stage>
                        )}

                        {/* Canvas Overlay */}
                        <Box
                            sx={{
                                position: 'absolute',
                                bottom: 16,
                                left: 16,
                                display: 'flex',
                                gap: 1,
                                flexWrap: 'wrap'
                            }}
                        >
                            <Chip
                                label={`Zoom: ${Math.round(zoom * 100)}%`}
                                size="small"
                                sx={{ bgcolor: 'rgba(255,255,255,0.9)' }}
                            />
                            {isPipeMode && (
                                <Chip
                                    label="Pipe Mode - Click symbols to connect"
                                    color="primary"
                                    size="small"
                                    sx={{ bgcolor: 'rgba(37, 99, 235, 0.9)', color: 'white' }}
                                />
                            )}
                            {selectedElement && (
                                <Chip
                                    label={`Selected: ${selectedElement.displayName || selectedElement.key}`}
                                    color="secondary"
                                    size="small"
                                    sx={{ bgcolor: 'rgba(124, 58, 237, 0.9)', color: 'white' }}
                                />
                            )}
                            {isConnected && (
                                <Chip
                                    icon={<WifiIcon />}
                                    label={`Live: ${Object.keys(debouncedMeasurements).length} tags`}
                                    color="success"
                                    size="small"
                                    sx={{ bgcolor: 'rgba(76, 175, 80, 0.9)', color: 'white' }}
                                />
                            )}
                            {!isConnected && error && (
                                <Chip
                                    icon={<WifiOffIcon />}
                                    label={`Error: ${error}`}
                                    color="error"
                                    size="small"
                                    sx={{ bgcolor: 'rgba(244, 67, 54, 0.9)', color: 'white' }}
                                />
                            )}
                        </Box>
                    </Paper>
                </Box>

                {/* Enhanced Tools Sidebar */}
                <AdvancedToolsSidebar
                    selectedElement={selectedElement}
                    onAddSymbol={handleAddSymbol}
                    onPipeMode={startPipeMode}
                    isPipeMode={isPipeMode}
                    onDelete={deleteSelected}
                    deleteEnabled={!!selectedId}
                    onUpdateElement={handleUpdateElement}
                    tags={tags}
                    devices={devices}
                    measurements={debouncedMeasurements}
                    isConnected={isConnected}
                    onExportTemplate={handleExportTemplate}
                    onImportTemplate={handleImportTemplate}
                    onLoadSaved={handleLoadSaved}
                    onNewDiagram={handleNewDiagram}
                    onSave={handleSave}
                    saving={saving}
                    projectId={projectId}
                    getTagDataByName={getTagDataByName}
                />
            </Box>

            {/* Enhanced Modern Snackbar */}
            <ModernSnackbar
                open={snackbar.open}
                onClose={() => setSnackbar(s => ({ ...s, open: false }))}
                message={snackbar.message}
                severity={snackbar.severity}
            />
        </Box>
    );
}