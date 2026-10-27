// Import MUI components for the HR Dashboard layout.
import { Box, Typography } from "@mui/material";

// Display an empty HR Dashboard until its requirements are finalized.
export default function HRDashboard() {
  return (
    <Box sx={{ p: 3 }}>
      {/* Display the existing ProdTrack breadcrumb style. */}
      <Typography sx={{ fontSize: 13, color: "#64748b", mb: 1 }}>
        ProdTrack · HR
      </Typography>

      {/* Display only the Dashboard title for now. */}
      <Typography
        sx={{
          fontSize: 24,
          fontWeight: 800,
          color: "#10243e",
        }}
      >
        Dashboard
      </Typography>
    </Box>
  );
}