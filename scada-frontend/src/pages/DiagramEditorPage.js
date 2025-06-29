// src/pages/DiagramEditorPage.js - Modern SCADA HMI Editor
import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box, Paper, Typography, IconButton, Button, Snackbar, Alert, Tooltip,
    Chip, Stack, Card, CardContent, Divider, Drawer, AppBar, Toolbar,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
    FormControl, InputLabel, Select, Switch, FormControlLabel, Tabs, Tab,
    List, ListItem, ListItemText, ListItemIcon, Accordion, AccordionSummary,
    AccordionDetails, Slider, Grid, Avatar, Badge
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
    WifiOff as WifiOffIcon
} from '@mui/icons-material';
import axios from '../api/axios';

// Import Modern Symbols
import symbolList, { PipeComponent, statusTypes, sensorTypes } from '../symbols/symbolList';
import { motion } from 'framer-motion';
import { useRealTimeData } from '../hooks/useWebSocket';

// Modern Snackbar Component
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

// Enhanced Properties Panel with Real-time Data
function ElementPropertiesPanel({ selectedElement, onUpdateElement, tags, devices, measurements, isConnected }) {
    const [linkedTag, setLinkedTag] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [color, setColor] = useState('#2563eb');
    const [sensorType, setSensorType] = useState('temperature');

    useEffect(() => {
        if (selectedElement) {
            setLinkedTag(selectedElement.linkedTag || '');
            setDisplayName(selectedElement.displayName || selectedElement.key || '');
            setColor(selectedElement.color || '#2563eb');
            setSensorType(selectedElement.sensorType || 'temperature');
        }
    }, [selectedElement]);

    const handleUpdate = () => {
        if (selectedElement) {
            onUpdateElement(selectedElement.id, {
                ...selectedElement,
                linkedTag,
                displayName,
                color,
                sensorType
            });
        }
    };

    // Get real-time value for linked tag
    const getRealTimeValue = () => {
        if (linkedTag && measurements[linkedTag]) {
            return measurements[linkedTag].value;
        }
        return null;
    };

    if (!selectedElement) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <SettingsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                    Select an element to edit properties
                </Typography>
            </Box>
        );
    }

    const realTimeValue = getRealTimeValue();

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                Element Properties
            </Typography>

            {/* Real-time Status */}
            <Card sx={{ mb: 3, bgcolor: isConnected ? 'success.50' : 'error.50' }}>
                <CardContent sx={{ p: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        {isConnected ? <WifiIcon color="success" /> : <WifiOffIcon color="error" />}
                        <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {isConnected ? 'Live Data Connected' : 'Offline Mode'}
                            </Typography>
                            {realTimeValue !== null && (
                                <Typography variant="body2" color="text.secondary">
                                    Current Value: {realTimeValue}
                                </Typography>
                            )}
                        </Box>
                    </Stack>
                </CardContent>
            </Card>

            <Stack spacing={3}>
                <TextField
                    label="Display Name"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    fullWidth
                    size="small"
                />

                <TextField
                    label="Color"
                    type="color"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    fullWidth
                    size="small"
                />

                {selectedElement.key === 'sensor' && (
                    <FormControl fullWidth size="small">
                        <InputLabel>Sensor Type</InputLabel>
                        <Select
                            value={sensorType}
                            onChange={e => setSensorType(e.target.value)}
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

                <FormControl fullWidth size="small">
                    <InputLabel>Link to Tag</InputLabel>
                    <Select
                        value={linkedTag}
                        onChange={e => setLinkedTag(e.target.value)}
                        label="Link to Tag"
                    >
                        <MenuItem value="">None</MenuItem>
                        {tags.map(tag => (
                            <MenuItem key={tag.tag_id} value={tag.tag_name}>
                                {tag.tag_name} ({tag.tag_type})
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {linkedTag && (
                    <Alert severity="info" sx={{ fontSize: '0.75rem' }}>
                        This element will display real-time data from tag: <strong>{linkedTag}</strong>
                        {realTimeValue !== null && (
                            <Box sx={{ mt: 1 }}>
                                Real-time value: <strong>{realTimeValue}</strong>
                            </Box>
                        )}
                    </Alert>
                )}

                <Button
                    variant="contained"
                    onClick={handleUpdate}
                    fullWidth
                    sx={{
                        background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)'
                    }}
                >
                    Apply Changes
                </Button>
            </Stack>
        </Box>
    );
}

// Advanced Tools Sidebar
function AdvancedToolsSidebar({
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
                                  saving
                              }) {
    const [activeTab, setActiveTab] = useState(0);

    return (
        <Drawer
            variant="permanent"
            anchor="right"
            sx={{
                width: 350,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: 350,
                    boxSizing: 'border-box',
                    background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                    borderLeft: '1px solid #e2e8f0',
                },
            }}
        >
            {/* Tabs */}
            <Tabs
                value={activeTab}
                onChange={(e, newValue) => setActiveTab(newValue)}
                sx={{ borderBottom: '1px solid #e2e8f0' }}
            >
                <Tab label="Tools" />
                <Tab label="Properties" />
            </Tabs>

            {/* Tools Tab */}
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
                                    startIcon={<SaveIcon />}
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
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                Templates are reusable diagram layouts without data bindings
                            </Typography>
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

            {/* Properties Tab */}
            {activeTab === 1 && (
                <ElementPropertiesPanel
                    selectedElement={selectedElement}
                    onUpdateElement={onUpdateElement}
                    tags={tags}
                    devices={devices}
                    measurements={measurements}
                    isConnected={isConnected}
                />
            )}
        </Drawer>
    );
}

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;

export default function DiagramEditorPage() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const stageRef = useRef();

    // WebSocket for real-time data
    const { measurements, isConnected, getTagValue } = useRealTimeData(projectId);

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

    // Load diagram, tags, and devices
    useEffect(() => {
        if (!projectId) return;

        console.log('Loading diagram for project:', projectId);

        // Load diagram
        setLoading(true);
        axios.get(`/diagrams/project/${projectId}`)
            .then(res => {
                console.log('Diagram response:', res.data);

                // Handle both old and new format
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

                console.log('Parsed diagram data:', diagramData);
                setElements(diagramData);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error loading diagram:', err);
                setLoading(false);
                setSnackbar({ open: true, message: "Failed to load diagram", severity: "error" });
            });

        // Load devices and tags for data binding
        axios.get(`/devices/project/${projectId}`)
            .then(res => {
                setDevices(res.data);
                // Load tags for all devices
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
                console.error('Error loading project data:', err);
                setSnackbar({ open: true, message: "Failed to load project data", severity: "error" });
            });
    }, [projectId]);

    // Add modern symbol with enhanced properties
    function handleAddSymbol(key) {
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

        console.log('Adding new modern element:', newElement);
        setElements(prev => [...prev, newElement]);
        setSelectedId(id);
        setSnackbar({ open: true, message: `${sym.label} added to canvas`, severity: "success" });
    }

    // Get real-time device status
    const getDeviceStatus = (element) => {
        if (!isConnected) return 'offline';
        if (!element.linkedTag) return element.status || 'online';

        const tagValue = getTagValue(element.linkedTag);
        if (tagValue === null || tagValue === undefined) return 'warning';

        return 'online';
    };

    // Get real-time device data
    const getDeviceData = (element) => {
        const baseData = {
            connected: isConnected && element.linkedTag ? !!getTagValue(element.linkedTag) : isConnected,
            status: getDeviceStatus(element)
        };

        if (!element.linkedTag) return baseData;

        const tagValue = getTagValue(element.linkedTag);

        switch (element.key) {
            case 'tank':
                return {
                    ...baseData,
                    fillLevel: tagValue || element.fillLevel || 75
                };
            case 'pump':
                return {
                    ...baseData,
                    speed: tagValue || element.speed || 1450
                };
            case 'valve':
                return {
                    ...baseData,
                    position: tagValue || element.position || 100
                };
            case 'motor':
                return {
                    ...baseData,
                    rpm: tagValue || element.rpm || 1450
                };
            case 'sensor':
                return {
                    ...baseData,
                    value: tagValue
                };
            case 'pipe':
                return {
                    ...baseData,
                    flowDirection: element.flowDirection || 'right'
                };
            default:
                return baseData;
        }
    };

    // Pipe mode handler
    function startPipeMode() {
        setIsPipeMode(!isPipeMode);
        setPipePoints([]);
        setSelectedId(null);
        console.log('Pipe mode:', !isPipeMode);
    }

    // Canvas click handler
    function handleCanvasClick(e) {
        console.log('Canvas clicked, pipe mode:', isPipeMode);

        if (isPipeMode) {
            const clickedShape = e.target;
            console.log('Clicked shape:', clickedShape);

            // Get id from Group or shape
            const clickedId = clickedShape && clickedShape.getParent()
                ? clickedShape.getParent().attrs.id
                : clickedShape.attrs.id;
            console.log('Clicked ID:', clickedId);

            const clicked = elements.find(el => el.type === 'symbol' && clickedId === el.id);
            console.log('Found element:', clicked);

            if (clicked) {
                const centerX = clicked.x + clicked.width / 2;
                const centerY = clicked.y + clicked.height / 2;
                const newPoint = { x: centerX, y: centerY, id: clicked.id };
                const pts = [...pipePoints, newPoint];
                console.log('Pipe points:', pts);

                if (pts.length === 2) {
                    const newPipe = {
                        id: `pipe_${Date.now()}`,
                        type: 'connection',
                        points: pts,
                        color: '#2563eb',
                        status: 'online',
                        active: true
                    };
                    console.log('Creating pipe connection:', newPipe);
                    setElements(prev => [...prev, newPipe]);
                    setPipePoints([]);
                    setIsPipeMode(false);
                    setSnackbar({ open: true, message: "Pipe connection created", severity: "success" });
                } else {
                    setPipePoints(pts);
                    console.log('First point set, waiting for second');
                }
            }
            return;
        }

        // Normal click - deselect if clicking empty area
        if (e.target === e.target.getStage()) {
            setSelectedId(null);
        }
    }

    // Update element properties
    function handleUpdateElement(elementId, updatedElement) {
        setElements(prev =>
            prev.map(el => el.id === elementId ? updatedElement : el)
        );
        setSnackbar({ open: true, message: "Element updated", severity: "success" });
    }

    // Drag handler
    function handleDrag(id, newX, newY) {
        setElements(prev =>
            prev.map(el =>
                el.id === id ? { ...el, x: newX, y: newY } : el
            )
        );
    }

    // Save diagram to database
    function handleSave() {
        if (!projectId) return;
        setSaving(true);

        console.log('Saving modern elements to database:', elements);

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
                real_time_enabled: isConnected
            }
        };

        axios.post(`/diagrams/project/${projectId}`, saveData)
            .then(() => {
                setSaving(false);
                setSnackbar({
                    open: true,
                    message: `Modern SCADA diagram saved! ${elements.length} elements with real-time status.`,
                    severity: "success"
                });
            })
            .catch(err => {
                console.error('Save error:', err);
                setSaving(false);
                setSnackbar({ open: true, message: "Failed to save diagram", severity: "error" });
            });
    }

    // Delete selected element
    function deleteSelected() {
        if (!selectedId) return;
        const element = elements.find(el => el.id === selectedId);
        setElements(prev => prev.filter(el => el.id !== selectedId));
        setSelectedId(null);
        setSnackbar({ open: true, message: `${element?.displayName || 'Element'} deleted`, severity: "info" });
    }

    // Export diagram as template
    function handleExportTemplate() {
        const exportData = {
            diagram: elements,
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
    }

    // Import diagram template
    function handleImportTemplate() {
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
    }

    // Load saved diagram
    function handleLoadSaved() {
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
    }

    // New diagram
    function handleNewDiagram() {
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
    }

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

    // Get selected element
    const selectedElement = elements.find(el => el.id === selectedId);

    // Render modern elements with real-time data
    function renderElements() {
        console.log('Rendering modern elements:', elements);

        return elements.map(el => {
            if (el.visible === false) return null;

            if (el.type === 'symbol') {
                const sym = symbolList.find(s => s.key === el.key);
                if (!sym) {
                    console.warn('Modern symbol not found for key:', el.key);
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
                        onClick={() => {
                            console.log('Modern element clicked:', el.id);
                            setSelectedId(el.id);
                        }}
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
    }

    // Render temp pipe preview
    function renderTempPipe() {
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
    }

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
                            Modern SCADA HMI Designer
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Industrial Process Monitoring Interface
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
                            label={isConnected ? 'Live Data' : 'Offline'}
                            color={isConnected ? 'success' : 'default'}
                            size="small"
                            sx={{ fontWeight: 600 }}
                        />
                        <Chip
                            icon={<MemoryIcon />}
                            label={`${Object.keys(measurements).length} Tags`}
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
                                    Loading modern SCADA diagram...
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
                                    {renderElements()}
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
                                    label="Real-time Data Active"
                                    color="success"
                                    size="small"
                                    sx={{ bgcolor: 'rgba(76, 175, 80, 0.9)', color: 'white' }}
                                />
                            )}
                        </Box>
                    </Paper>
                </Box>

                {/* Tools Sidebar */}
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
                    measurements={measurements}
                    isConnected={isConnected}
                    onExportTemplate={handleExportTemplate}
                    onImportTemplate={handleImportTemplate}
                    onLoadSaved={handleLoadSaved}
                    onNewDiagram={handleNewDiagram}
                    onSave={handleSave}
                    saving={saving}
                />
            </Box>

            {/* Modern Snackbar */}
            <ModernSnackbar
                open={snackbar.open}
                onClose={() => setSnackbar(s => ({ ...s, open: false }))}
                message={snackbar.message}
                severity={snackbar.severity}
            />
        </Box>
    );
}