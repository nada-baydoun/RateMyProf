'use client';

import { Box, Button, Stack, TextField, createTheme, ThemeProvider, CssBaseline, Typography } from '@mui/material';
import { useState } from 'react';
import { Oval } from 'react-loader-spinner';

const theme = createTheme({
  palette: {
    primary: {
      main: '#4C9A2A', // Earthy Green for the header
      light: '#77B255', // Lighter Green for chat bubbles
      dark: '#3B7A1A', // Darker Green for buttons and accents
    },
    secondary: {
      main: '#A5D6A7', // Light Olive Green for secondary elements
      light: '#C8E6C9', // Very light olive green
      dark: '#4CAF50', // Darker Olive Green
    },
    background: {
      default: '#F0F7EC', // Very light, neutral green background
      paper: '#E0E8D5',   // Slightly darker greenish paper for content areas
    },
    text: {
      primary: '#2F4F4F', // Dark Slate Gray for high contrast text
      secondary: '#4C9A2A', // Earthy Green for secondary text
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      color: '#FFFFFF', // White for header text to stand out
    },
    body1: {
      fontSize: '1rem',
      color: '#2F4F4F', // Dark Slate Gray for readability
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 25,
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 20px',
          backgroundColor: '#3B7A1A', // Darker Green
          '&:hover': {
            backgroundColor: '#4C9A2A', // Earthy Green on hover
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 25,
            backgroundColor: '#FFFFFF', // White input field for clarity
          },
        },
      },
    },
    MuiBox: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          backgroundColor: '#E0E8D5', // Paper color
        },
      },
    },
  },
});

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Welcome to the Rate My Professor assistant! I'm here to help you find information about professors and courses. How can I assist you today?`,
    },
  ]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!message.trim()) return;

    setMessage('');
    setLoading(true);
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: 'user', content: message },
      { role: 'assistant', content: '' },
    ]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([...messages, { role: 'user', content: message }]),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        setMessages((prevMessages) => {
          const updatedMessages = [...prevMessages];
          updatedMessages[updatedMessages.length - 1].content += text;
          return updatedMessages;
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: 'assistant', content: 'I apologize, there was an error processing your request. Can you please try again?' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        width="100vw"
        height="100vh"
        display="flex"
        justifyContent="center"
        alignItems="center"
        bgcolor="background.default"
        p={3}
      >
        <Box
          width="100%"
          maxWidth="700px"
          height="80%"
          bgcolor="background.paper"
          borderRadius={20}
          boxShadow={5}
          overflow="hidden"
          display="flex"
          flexDirection="column"
        >
          <Box p={3} bgcolor="primary.main" color="white" display="flex" justifyContent="center">
            <Typography variant="h1" component="h1" align="center">Rate My Professor Assistant</Typography>
          </Box>
          <Stack
            direction="column"
            spacing={2}
            flexGrow={1}
            overflow="auto"
            p={3}
            sx={{
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'background.default',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'primary.light',
                borderRadius: '4px',
              },
            }}
          >
            {messages.map((message, index) => (
              <Box
                key={index}
                alignSelf={message.role === 'assistant' ? 'flex-start' : 'flex-end'}
                bgcolor={message.role === 'assistant' ? 'primary.light' : 'secondary.main'}
                color="text.primary"
                p={2}
                borderRadius={12}
                maxWidth="80%"
                sx={{ 
                  wordBreak: 'break-word',
                  boxShadow: 1,
                }}
              >
                <Typography variant="body1">{message.content}</Typography>
              </Box>
            ))}
            {loading && (
              <Box display="flex" justifyContent="center" p={2}>
                <Oval
                  height={40}
                  width={40}
                  color={theme.palette.primary.main}
                  secondaryColor={theme.palette.secondary.main}
                  ariaLabel="loading"
                />
              </Box>
            )}
          </Stack>
          <Box p={3} bgcolor="background.default" borderTop={`1px solid ${theme.palette.primary.main}`}>
            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Ask about a professor you would like to know about"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <Button
                variant="contained"
                onClick={sendMessage}
                disabled={loading || !message.trim()}
              >
                Send
              </Button>
            </Stack>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
