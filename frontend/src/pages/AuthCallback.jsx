import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../auth/AuthContext';
import {
  Container,
  Paper,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          setError(error.message);
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        if (data.session) {
          console.log('Auth callback successful');
          navigate('/dashboard', { replace: true });
        } else {
          setError('Sessão não encontrada');
          setTimeout(() => navigate('/login'), 3000);
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setError('Erro na autenticação');
        setTimeout(() => navigate('/login'), 3000);
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  // If user is already authenticated, redirect immediately
  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper elevation={4} sx={{ p: 4 }}>
          <Box display="flex" flexDirection="column" alignItems="center">
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Completando autenticação...
            </Typography>
          </Box>
        </Paper>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper elevation={4} sx={{ p: 4 }}>
          <Box display="flex" flexDirection="column" alignItems="center">
            <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
              {error}
            </Alert>
            <Typography variant="body1" color="text.secondary" textAlign="center">
              Redirecionando para a página de login...
            </Typography>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={4} sx={{ p: 4 }}>
        <Box display="flex" flexDirection="column" alignItems="center">
          <Typography variant="h6" color="success.main" gutterBottom>
            Autenticação realizada com sucesso!
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center">
            Redirecionando para o dashboard...
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default AuthCallback;