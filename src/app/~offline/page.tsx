import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";

export default function OfflinePage() {
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          You&apos;re offline
        </Typography>
        <Typography color="text.secondary">
          CleanTube needs a network connection for search, channels, and playback.
          Reconnect and try again.
        </Typography>
      </Box>
    </Container>
  );
}
