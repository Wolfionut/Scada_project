import React, { useEffect, useState } from 'react';
import {
    Container, Box, Typography, Grid, Card, CardContent, IconButton, Button, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField, Tooltip, Snackbar, Alert,
    Chip, Avatar, Stack
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    ArrowForward as ArrowForwardIcon,
    Folder as FolderIcon,
    AccessTime as AccessTimeIcon,
    Devices as DevicesIcon,
    WifiOff as WifiOffIcon,
    Wifi as WifiIcon
} from '@mui/icons-material';
import axios from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGlobalWebSocket } from '../hooks/useWebSocket'; // Add this import
import { motion } from 'framer-motion';

export default function ProjectsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { isConnected, error } = useGlobalWebSocket(); // Add WebSocket connection
    const [projects, setProjects] = useState([]);
    const [addOpen, setAddOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [current, setCurrent] = useState(null);
    const [projectName, setProjectName] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, msg: '', severity: 'success' });

    const fetchProjects = async () => {
        try {
            const res = await axios.get('/projects');
            setProjects(res.data);
        } catch {
            setSnackbar({ open: true, msg: 'Failed to load projects', severity: 'error' });
        }
    };

    useEffect(() => { fetchProjects(); }, []);

    const handleAdd = async () => {
        try {
            await axios.post('/projects', { project_name: projectName });
            setAddOpen(false); setProjectName('');
            setSnackbar({ open: true, msg: 'Project created successfully!', severity: 'success' });
            fetchProjects();
        } catch {
            setSnackbar({ open: true, msg: 'Failed to create project', severity: 'error' });
        }
    };

    const handleEdit = async () => {
        try {
            await axios.put(`/projects/${current.id}`, { project_name: projectName });
            setEditOpen(false); setProjectName('');
            setSnackbar({ open: true, msg: 'Project updated successfully!', severity: 'success' });
            fetchProjects();
        } catch {
            setSnackbar({ open: true, msg: 'Failed to update project', severity: 'error' });
        }
    };

    const handleDelete = async () => {
        try {
            await axios.delete(`/projects/${current.id}`);
            setDeleteOpen(false);
            setSnackbar({ open: true, msg: 'Project deleted successfully!', severity: 'success' });
            fetchProjects();
        } catch {
            setSnackbar({ open: true, msg: 'Failed to delete project', severity: 'error' });
        }
    };

    const handleOpenProject = (projectId) => {
        navigate(`/project/${projectId}/devices`);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                py: 6
            }}
        >
            <Container maxWidth="xl">
                {/* Header */}
                <Box sx={{ mb: 6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Avatar
                            sx={{
                                width: 48,
                                height: 48,
                                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)'
                            }}
                        >
                            <FolderIcon />
                        </Avatar>
                        <Box>
                            <Typography
                                variant="h3"
                                sx={{
                                    fontWeight: 800,
                                    background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    color: 'transparent'
                                }}
                            >
                                Projects
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                Manage your industrial automation projects
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4 }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Chip
                                icon={<FolderIcon />}
                                label={`${projects.length} Projects`}
                                color="primary"
                                sx={{ fontWeight: 600 }}
                            />
                            <Typography variant="body2" color="text.secondary">
                                Welcome back, {user?.full_name || user?.username}
                            </Typography>

                            {/* WebSocket Connection Status */}
                            <Chip
                                icon={isConnected ? <WifiIcon /> : <WifiOffIcon />}
                                label={isConnected ? 'Connected' : 'Disconnected'}
                                color={isConnected ? 'success' : 'error'}
                                size="small"
                                sx={{ fontWeight: 600 }}
                            />
                        </Stack>

                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => { setProjectName(''); setAddOpen(true); }}
                            sx={{
                                borderRadius: 3,
                                px: 3,
                                py: 1.5,
                                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                                boxShadow: '0 4px 12px rgb(37 99 235 / 0.3)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                                    boxShadow: '0 8px 24px rgb(37 99 235 / 0.4)',
                                    transform: 'translateY(-2px)'
                                }
                            }}
                        >
                            New Project
                        </Button>
                    </Box>

                    {/* WebSocket Error Alert */}
                    {error && (
                        <Alert
                            severity="warning"
                            sx={{ mt: 2, borderRadius: 2 }}
                            action={
                                <Button
                                    color="inherit"
                                    size="small"
                                    onClick={() => window.location.reload()}
                                >
                                    Retry
                                </Button>
                            }
                        >
                            Real-time connection issue: {error}
                        </Alert>
                    )}
                </Box>

                {/* Projects Grid */}
                {projects.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card
                            sx={{
                                p: 6,
                                textAlign: 'center',
                                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                                border: '2px dashed #cbd5e1'
                            }}
                        >
                            <FolderIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                                No Projects Yet
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                                Create your first project to start building your SCADA system
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => { setProjectName(''); setAddOpen(true); }}
                            >
                                Create First Project
                            </Button>
                        </Card>
                    </motion.div>
                ) : (
                    <Grid container spacing={3}>
                        {projects.map((project, index) => (
                            <Grid item xs={12} sm={6} lg={4} key={project.id}>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    whileHover={{ y: -4 }}
                                >
                                    <Card
                                        sx={{
                                            height: '100%',
                                            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                                            border: '1px solid #e2e8f0',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease-in-out',
                                            '&:hover': {
                                                borderColor: '#2563eb',
                                                boxShadow: '0 20px 40px rgb(37 99 235 / 0.1)',
                                                '& .project-actions': {
                                                    opacity: 1,
                                                    transform: 'translateY(0)'
                                                }
                                            }
                                        }}
                                        onClick={() => handleOpenProject(project.id)}
                                    >
                                        <CardContent sx={{ p: 3 }}>
                                            {/* Project Header */}
                                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
                                                <Avatar
                                                    sx={{
                                                        width: 40,
                                                        height: 40,
                                                        background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                                                        fontSize: '1.1rem',
                                                        fontWeight: 700
                                                    }}
                                                >
                                                    {project.project_name[0]?.toUpperCase()}
                                                </Avatar>
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography
                                                        variant="h6"
                                                        sx={{
                                                            fontWeight: 700,
                                                            color: 'text.primary',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            mb: 0.5
                                                        }}
                                                    >
                                                        {project.project_name}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <AccessTimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                                        <Typography variant="caption" color="text.secondary">
                                                            Created {formatDate(project.created_at)}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </Box>

                                            {/* Project Stats */}
                                            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                                                <Chip
                                                    icon={<DevicesIcon />}
                                                    label="5 Devices"
                                                    size="small"
                                                    sx={{
                                                        bgcolor: 'primary.50',
                                                        color: 'primary.main',
                                                        fontWeight: 600
                                                    }}
                                                />
                                                <Chip
                                                    icon={isConnected ? <WifiIcon /> : <WifiOffIcon />}
                                                    label={isConnected ? "Online" : "Offline"}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: isConnected ? 'success.50' : 'error.50',
                                                        color: isConnected ? 'success.main' : 'error.main',
                                                        fontWeight: 600
                                                    }}
                                                />
                                            </Box>

                                            {/* Project Description */}
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{
                                                    mb: 3,
                                                    lineHeight: 1.6,
                                                    height: '3.2em',
                                                    overflow: 'hidden',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical'
                                                }}
                                            >
                                                Industrial automation project with real-time monitoring and control capabilities.
                                            </Typography>

                                            {/* Action Buttons */}
                                            <Box
                                                className="project-actions"
                                                sx={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    opacity: 0,
                                                    transform: 'translateY(10px)',
                                                    transition: 'all 0.3s ease-in-out'
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                    <Tooltip title="Edit Project">
                                                        <IconButton
                                                            size="small"
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                setCurrent(project);
                                                                setProjectName(project.project_name);
                                                                setEditOpen(true);
                                                            }}
                                                            sx={{
                                                                bgcolor: 'primary.50',
                                                                color: 'primary.main',
                                                                '&:hover': {
                                                                    bgcolor: 'primary.100'
                                                                }
                                                            }}
                                                        >
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Delete Project">
                                                        <IconButton
                                                            size="small"
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                setCurrent(project);
                                                                setDeleteOpen(true);
                                                            }}
                                                            sx={{
                                                                bgcolor: 'error.50',
                                                                color: 'error.main',
                                                                '&:hover': {
                                                                    bgcolor: 'error.100'
                                                                }
                                                            }}
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>

                                                <Button
                                                    endIcon={<ArrowForwardIcon />}
                                                    variant="contained"
                                                    size="small"
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        handleOpenProject(project.id);
                                                    }}
                                                    sx={{
                                                        borderRadius: 2,
                                                        px: 2,
                                                        py: 0.5,
                                                        fontSize: '0.75rem',
                                                        background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)'
                                                    }}
                                                >
                                                    Open
                                                </Button>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </Grid>
                        ))}
                    </Grid>
                )}

                {/* Add Project Dialog */}
                <Dialog
                    open={addOpen}
                    onClose={() => setAddOpen(false)}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{
                        sx: {
                            borderRadius: 4,
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
                        }
                    }}
                >
                    <DialogTitle sx={{ pb: 2 }}>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                            Create New Project
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Start a new industrial automation project
                        </Typography>
                    </DialogTitle>
                    <DialogContent sx={{ pt: 1 }}>
                        <TextField
                            label="Project Name"
                            value={projectName}
                            onChange={e => setProjectName(e.target.value)}
                            fullWidth
                            required
                            autoFocus
                            placeholder="Enter a descriptive project name"
                            sx={{ mt: 2 }}
                        />
                    </DialogContent>
                    <DialogActions sx={{ p: 3, pt: 2 }}>
                        <Button
                            onClick={() => setAddOpen(false)}
                            sx={{ borderRadius: 2 }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAdd}
                            variant="contained"
                            disabled={!projectName.trim()}
                            sx={{
                                borderRadius: 2,
                                px: 3,
                                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)'
                            }}
                        >
                            Create Project
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Edit Project Dialog */}
                <Dialog
                    open={editOpen}
                    onClose={() => setEditOpen(false)}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{
                        sx: {
                            borderRadius: 4,
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
                        }
                    }}
                >
                    <DialogTitle sx={{ pb: 2 }}>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                            Edit Project
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Update project information
                        </Typography>
                    </DialogTitle>
                    <DialogContent sx={{ pt: 1 }}>
                        <TextField
                            label="Project Name"
                            value={projectName}
                            onChange={e => setProjectName(e.target.value)}
                            fullWidth
                            required
                            autoFocus
                            sx={{ mt: 2 }}
                        />
                    </DialogContent>
                    <DialogActions sx={{ p: 3, pt: 2 }}>
                        <Button
                            onClick={() => setEditOpen(false)}
                            sx={{ borderRadius: 2 }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleEdit}
                            variant="contained"
                            disabled={!projectName.trim()}
                            sx={{
                                borderRadius: 2,
                                px: 3,
                                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)'
                            }}
                        >
                            Save Changes
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Delete Project Dialog */}
                <Dialog
                    open={deleteOpen}
                    onClose={() => setDeleteOpen(false)}
                    maxWidth="sm"
                    PaperProps={{
                        sx: {
                            borderRadius: 4,
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
                        }
                    }}
                >
                    <DialogTitle sx={{ pb: 2 }}>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main' }}>
                            Delete Project
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            This action cannot be undone
                        </Typography>
                    </DialogTitle>
                    <DialogContent>
                        <Typography variant="body1">
                            Are you sure you want to delete <strong>{current?.project_name}</strong>?
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            All devices, tags, measurements, and diagrams will be permanently removed.
                        </Typography>
                    </DialogContent>
                    <DialogActions sx={{ p: 3, pt: 2 }}>
                        <Button
                            onClick={() => setDeleteOpen(false)}
                            sx={{ borderRadius: 2 }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDelete}
                            variant="contained"
                            color="error"
                            sx={{
                                borderRadius: 2,
                                px: 3
                            }}
                        >
                            Delete Project
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Snackbar Alerts */}
                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={4000}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <Alert
                        severity={snackbar.severity}
                        sx={{
                            width: '100%',
                            borderRadius: 3,
                            fontWeight: 600
                        }}
                        onClose={() => setSnackbar({ ...snackbar, open: false })}
                    >
                        {snackbar.msg}
                    </Alert>
                </Snackbar>
            </Container>
        </Box>
    );
}