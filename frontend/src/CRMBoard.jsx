import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import {
  Container,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CRMBoard = () => {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { user, session } = useAuth();
  
  const [board, setBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dialog states
  const [newColumnDialog, setNewColumnDialog] = useState(false);
  const [newCardDialog, setNewCardDialog] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState(null);

  // Form states
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [newCard, setNewCard] = useState({
    title: '',
    description: '',
    contact_name: '',
    contact_email: '',
    estimated_value: 0,
    priority: 'medium'
  });

  // Load board data
  const loadBoardData = async () => {
    if (!boardId || !session?.access_token) return;
    
    try {
      setLoading(true);
      
      // Load columns
      const columnsResponse = await fetch(`${API}/boards/${boardId}/columns`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (columnsResponse.ok) {
        const columnsData = await columnsResponse.json();
        setColumns(columnsData);
      } else {
        throw new Error('Falha ao carregar colunas');
      }

      // Load cards
      const cardsResponse = await fetch(`${API}/cards`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (cardsResponse.ok) {
        const cardsData = await cardsResponse.json();
        setCards(cardsData);
      } else {
        throw new Error('Falha ao carregar cartões');
      }

    } catch (error) {
      console.error('Error loading board data:', error);
      setError(error.message);
      toast.error('Erro ao carregar dados do quadro');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (boardId) {
      loadBoardData();
    }
  }, [boardId, session]);

  // Create new card
  const createCard = async () => {
    if (!newCard.title.trim() || !selectedColumn) {
      toast.error('Título do cartão é obrigatório');
      return;
    }

    try {
      const response = await fetch(`${API}/cards`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newCard,
          column_id: selectedColumn.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCards(prev => [...prev, data.card]);
        setNewCardDialog(false);
        setSelectedColumn(null);
        setNewCard({
          title: '',
          description: '',
          contact_name: '',
          contact_email: '',
          estimated_value: 0,
          priority: 'medium'
        });
        toast.success('Cartão criado com sucesso!');
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Erro ao criar cartão');
      }
    } catch (error) {
      console.error('Error creating card:', error);
      toast.error(error.message);
    }
  };

  // Drag and drop handler
  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    try {
      const response = await fetch(`${API}/cards/move`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          card_id: draggableId,
          destination_column_id: destination.droppableId,
          position: destination.index,
        }),
      });

      if (response.ok) {
        // Update local state optimistically
        setCards(prevCards =>
          prevCards.map(card =>
            card.id === draggableId
              ? { 
                  ...card, 
                  column_id: destination.droppableId,
                  position: destination.index 
                }
              : card
          )
        );
        toast.success('Cartão movido com sucesso!');
      } else {
        throw new Error('Falha ao mover cartão');
      }
    } catch (error) {
      console.error('Error moving card:', error);
      toast.error('Erro ao mover cartão');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Média';
      case 'low':
        return 'Baixa';
      default:
        return 'Média';
    }
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
          Carregando quadro...
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
    <Container maxWidth={false} sx={{ mt: 2, mb: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate('/dashboard')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
          CRM Pipeline
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setNewColumnDialog(true)}
        >
          Nova Coluna
        </Button>
      </Box>

      {/* Board Columns */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Box display="flex" gap={2} sx={{ overflowX: 'auto', pb: 2 }}>
          {columns.map((column) => (
            <Paper
              key={column.id}
              sx={{
                minWidth: 300,
                maxWidth: 300,
                bgcolor: 'grey.50',
                p: 0,
              }}
            >
              {/* Column Header */}
              <Box
                sx={{
                  p: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  bgcolor: column.color || 'primary.main',
                  color: 'white',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography variant="h6">
                  {column.title}
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  color="secondary"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setSelectedColumn(column);
                    setNewCardDialog(true);
                  }}
                  sx={{ minWidth: 'auto' }}
                >
                  +
                </Button>
              </Box>

              {/* Cards */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      minHeight: 200,
                      padding: 8,
                      backgroundColor: snapshot.isDraggingOver ? '#e3f2fd' : 'transparent'
                    }}
                  >
                    {cards
                      .filter(card => card.column_id === column.id)
                      .sort((a, b) => (a.position || 0) - (b.position || 0))
                      .map((card, index) => (
                        <Draggable
                          key={card.id}
                          draggableId={card.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              sx={{
                                mb: 1,
                                cursor: 'grab',
                                opacity: snapshot.isDragging ? 0.8 : 1,
                                transform: snapshot.isDragging ? 'rotate(5deg)' : 'none',
                                '&:hover': {
                                  boxShadow: 2
                                }
                              }}
                            >
                              <CardContent sx={{ p: 2 }}>
                                <Typography variant="subtitle1" gutterBottom>
                                  {card.title}
                                </Typography>
                                {card.description && (
                                  <Typography variant="body2" color="text.secondary" gutterBottom>
                                    {card.description}
                                  </Typography>
                                )}
                                
                                <Box sx={{ mt: 1, mb: 1 }}>
                                  <Chip
                                    size="small"
                                    label={getPriorityLabel(card.priority)}
                                    color={getPriorityColor(card.priority)}
                                  />
                                </Box>

                                {card.contact_name && (
                                  <Typography variant="caption" display="block" gutterBottom>
                                    <PersonIcon sx={{ fontSize: 14, mr: 0.5 }} />
                                    {card.contact_name}
                                  </Typography>
                                )}

                                {card.estimated_value > 0 && (
                                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold' }}>
                                    {formatCurrency(card.estimated_value)}
                                  </Typography>
                                )}
                              </CardContent>
                              
                              <CardActions sx={{ p: 1, pt: 0 }}>
                                <IconButton size="small">
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" color="error">
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </CardActions>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </Paper>
          ))}
        </Box>
      </DragDropContext>

      {/* New Card Dialog */}
      <Dialog 
        open={newCardDialog} 
        onClose={() => {
          setNewCardDialog(false);
          setSelectedColumn(null);
        }}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          Novo Cartão {selectedColumn && `- ${selectedColumn.title}`}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Título do Cartão"
            type="text"
            fullWidth
            variant="outlined"
            value={newCard.title}
            onChange={(e) => setNewCard(prev => ({ ...prev, title: e.target.value }))}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Descrição"
            type="text"
            fullWidth
            multiline
            rows={2}
            variant="outlined"
            value={newCard.description}
            onChange={(e) => setNewCard(prev => ({ ...prev, description: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Nome do Contato"
            type="text"
            fullWidth
            variant="outlined"
            value={newCard.contact_name}
            onChange={(e) => setNewCard(prev => ({ ...prev, contact_name: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Email do Contato"
            type="email"
            fullWidth
            variant="outlined"
            value={newCard.contact_email}
            onChange={(e) => setNewCard(prev => ({ ...prev, contact_email: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Valor Estimado (R$)"
            type="number"
            fullWidth
            variant="outlined"
            value={newCard.estimated_value}
            onChange={(e) => setNewCard(prev => ({ ...prev, estimated_value: parseFloat(e.target.value) || 0 }))}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Prioridade"
            select
            fullWidth
            variant="outlined"
            value={newCard.priority}
            onChange={(e) => setNewCard(prev => ({ ...prev, priority: e.target.value }))}
            SelectProps={{
              native: true,
            }}
          >
            <option value="low">Baixa</option>
            <option value="medium">Média</option>
            <option value="high">Alta</option>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setNewCardDialog(false);
            setSelectedColumn(null);
          }}>
            Cancelar
          </Button>
          <Button 
            onClick={createCard}
            variant="contained"
            disabled={!newCard.title.trim()}
          >
            Criar
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Column Dialog */}
      <Dialog 
        open={newColumnDialog} 
        onClose={() => setNewColumnDialog(false)}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Nova Coluna</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Título da Coluna"
            type="text"
            fullWidth
            variant="outlined"
            value={newColumnTitle}
            onChange={(e) => setNewColumnTitle(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewColumnDialog(false)}>
            Cancelar
          </Button>
          <Button 
            variant="contained"
            disabled={!newColumnTitle.trim()}
          >
            Criar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CRMBoard;