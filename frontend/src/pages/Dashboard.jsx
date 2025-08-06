import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Fab,
} from '@mui/material';
import {
  Add as AddIcon,
  Dashboard as DashboardIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newBoard, setNewBoard] = useState({
    title: '',
    description: ''
  });
  const [creating, setCreating] = useState(false);

  // Load user boards
  const loadBoards = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/boards`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBoards(data);
      } else if (response.status === 401) {
        toast.error('Sessão expirada. Faça login novamente.');
        navigate('/login');
      } else {
        throw new Error('Falha ao carregar quadros');
      }
    } catch (error) {
      console.error('Error loading boards:', error);
      setError('Erro ao carregar quadros');
      toast.error('Erro ao carregar quadros');
    } finally {
      setLoading(false);
    }
  };

  // Initialize user data
  const initializeUserData = async () => {
    try {
      const response = await fetch(`${API}/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('User data initialized');
        await loadBoards();
      }
    } catch (error) {
      console.error('Error initializing user data:', error);
    }
  };

  useEffect(() => {
    if (session?.access_token) {
      initializeUserData();
    }
  }, [session]);

  const handleCreateBoard = async () => {
    if (!newBoard.title.trim()) {
      toast.error('Título do quadro é obrigatório');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(`${API}/boards`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newBoard),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Quadro criado com sucesso!');
        setBoards(prev => [...prev, data.board]);
        setDialogOpen(false);
        setNewBoard({ title: '', description: '' });
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Erro ao criar quadro');
      }
    } catch (error) {
      console.error('Error creating board:', error);
      toast.error(error.message || 'Erro ao criar quadro');
    } finally {
      setCreating(false);
    }
  };

  const handleViewBoard = (boardId) => {
    navigate(`/boards/${boardId}`);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="80vh"
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Carregando seus quadros...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          <DashboardIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Meus Quadros
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Bem-vindo, {user?.user_metadata?.name || user?.email}! 
          Gerencie seus projetos e tarefas através dos quadros Kanban.
        </Typography>
      </Box>

      {/* Boards Grid */}
      {boards.length === 0 ? (
        <Box 
          display="flex" 
          flexDirection="column" 
          alignItems="center" 
          justifyContent="center"
          sx={{ mt: 8, mb: 8 }}
        >
          <Typography variant="h5" gutterBottom color="text.secondary">
            Nenhum quadro encontrado
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Crie seu primeiro quadro para começar a organizar suas tarefas
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            Criar Primeiro Quadro
          </Button>
        </Box>
      ) : (
        <>
          <Grid container spacing={3}>
            {boards.map((board) => (
              <Grid item xs={12} sm={6} md={4} key={board.id}>
                <Card 
                  elevation={2}
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.2s',
                    '&:hover': {
                      elevation: 4,
                      transform: 'translateY(-2px)',
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" component="h2" gutterBottom>
                      {board.title}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ mb: 2, minHeight: '40px' }}
                    >
                      {board.description || 'Sem descrição'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Criado em {formatDate(board.created_at)}
                    </Typography>
                  </CardContent>
                  
                  <CardActions>
                    <Button
                      size="small"
                      startIcon={<ViewIcon />}
                      onClick={() => handleViewBoard(board.id)}
                    >
                      Abrir
                    </Button>
                    <IconButton size="small" color="default">
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error">
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Floating Action Button */}
          <Fab
            color="primary"
            aria-label="criar quadro"
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
            }}
            onClick={() => setDialogOpen(true)}
          >
            <AddIcon />
          </Fab>
        </>
      )}

      {/* Create Board Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Criar Novo Quadro</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Título do Quadro"
            type="text"
            fullWidth
            variant="outlined"
            value={newBoard.title}
            onChange={(e) => setNewBoard(prev => ({ ...prev, title: e.target.value }))}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Descrição (opcional)"
            type="text"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newBoard.description}
            onChange={(e) => setNewBoard(prev => ({ ...prev, description: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDialogOpen(false)}
            disabled={creating}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleCreateBoard}
            variant="contained"
            disabled={creating || !newBoard.title.trim()}
          >
            {creating ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                Criando...
              </>
            ) : (
              'Criar'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Dashboard;