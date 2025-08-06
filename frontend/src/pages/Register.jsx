import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  Container,
  Paper,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Divider,
  CircularProgress,
} from '@mui/material';
import { Google, GitHub } from '@mui/icons-material';

const Register = () => {
  const { signUp, signInWithProvider } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Nome é obrigatório');
      return false;
    }
    
    if (formData.password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres');
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await signUp({
        email: formData.email,
        password: formData.password,
        name: formData.name,
      });
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    setError('');
    setLoading(true);

    try {
      await signInWithProvider(provider);
      // Note: OAuth redirect will handle navigation
    } catch (error) {
      console.error('Social login error:', error);
      setError(error.message || `Erro no cadastro com ${provider}`);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper elevation={4} sx={{ p: 4 }}>
          <Box display="flex" flexDirection="column" alignItems="center">
            <Typography variant="h5" component="h1" gutterBottom color="success.main">
              Cadastro realizado com sucesso! 🎉
            </Typography>
            <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 2 }}>
              Você será redirecionado para a página de login em alguns segundos.
            </Typography>
            <CircularProgress size={30} />
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={4} sx={{ p: 4 }}>
        <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1" gutterBottom color="primary">
            Cadastrar
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center">
            Crie sua conta no Gerenciador de Quadros
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mb: 3 }}>
          <TextField
            fullWidth
            name="name"
            label="Nome Completo"
            value={formData.name}
            onChange={handleChange}
            margin="normal"
            required
            autoComplete="name"
            autoFocus
          />
          
          <TextField
            fullWidth
            type="email"
            name="email"
            label="Email"
            value={formData.email}
            onChange={handleChange}
            margin="normal"
            required
            autoComplete="email"
          />
          
          <TextField
            fullWidth
            type="password"
            name="password"
            label="Senha"
            value={formData.password}
            onChange={handleChange}
            margin="normal"
            required
            autoComplete="new-password"
            helperText="Mínimo 8 caracteres"
          />
          
          <TextField
            fullWidth
            type="password"
            name="confirmPassword"
            label="Confirmar Senha"
            value={formData.confirmPassword}
            onChange={handleChange}
            margin="normal"
            required
            autoComplete="new-password"
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ mt: 3, mb: 2, py: 1.5 }}
          >
            {loading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Criando conta...
              </>
            ) : (
              'Criar Conta'
            )}
          </Button>
        </Box>

        <Divider sx={{ my: 2 }}>
          <Typography variant="body2" color="text.secondary">
            ou cadastre-se com
          </Typography>
        </Divider>

        <Box sx={{ mb: 3 }}>
          <Button
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<Google />}
            onClick={() => handleSocialLogin('google')}
            disabled={loading}
            sx={{ mb: 1, py: 1.5 }}
          >
            Google
          </Button>
          
          <Button
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<GitHub />}
            onClick={() => handleSocialLogin('github')}
            disabled={loading}
            sx={{ py: 1.5 }}
          >
            GitHub
          </Button>
        </Box>

        <Box textAlign="center">
          <Typography variant="body2" color="text.secondary">
            Já tem uma conta?{' '}
            <Link 
              to="/login" 
              style={{ 
                color: 'inherit',
                textDecoration: 'none',
                fontWeight: 'bold'
              }}
            >
              Entre aqui
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default Register;