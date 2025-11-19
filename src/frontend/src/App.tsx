import { Box, Container, Typography, Button } from '@mui/material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClipboardList } from '@fortawesome/free-solid-svg-icons'

function App() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ textAlign: 'center' }}>
        <FontAwesomeIcon icon={faClipboardList} size="4x" color="#0020C2" />
        <Typography variant="h3" sx={{ mt: 2, mb: 1 }}>
          COBRA Checklist POC
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Proof of concept is ready for development
        </Typography>
        <Button 
          variant="contained" 
          size="large"
          sx={{ minWidth: 48, minHeight: 48 }}
        >
          Get Started
        </Button>
      </Box>
    </Container>
  )
}

export default App
