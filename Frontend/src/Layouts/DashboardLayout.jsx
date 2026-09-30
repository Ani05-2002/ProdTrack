import Box from "@mui/material/Box";
import { useState } from "react";

import Header from "../components/Header.jsx";
import Sidebar from "../components/Sidebar.jsx";

export default function DashboardLayout({
  user,
  currentPage,
  onNavigate,
  onLogout,
  children,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box
      sx={{
        display: "flex",
        width: "100%",
        height: "100dvh",
        overflow: "hidden",
        bgcolor: "#eef2f7",
      }}
    >
      {/* SIDEBAR */}
      <Sidebar
        roleKey={user.roleKey}
        currentPage={currentPage}
        onNavigate={onNavigate}
        onSignOut={onLogout}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* RIGHT SIDE */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* HEADER */}
        <Box sx={{ flex: "0 0 auto", width: "100%" }}>
          <Header
            userName={user.name}
            role={user.role}
            onLogout={onLogout}
            onNotifications={() => onNavigate("notifications")}
            onMenuClick={() => setMobileOpen(true)}
            onProfileClick={() => onNavigate("my-profile")}
            // Gives the Header search access to the existing page-navigation function.
            onNavigate={onNavigate}
          />
        </Box>

        {/* SCROLLABLE CONTENT AREA */}
        <Box
          sx={{
            flex: "1 1 auto",
            minHeight: 0,
            minWidth: 0,
            position: "relative",
            bgcolor: "#eef2f7",
            overflow: "hidden",
          }}
        >
          <Box
            component="main"
            sx={{
              position: "absolute",
              top: 0, left: 0, right: 0, bottom: 0,
              p: { xs: 1.5, sm: 2, md: 3 },
              overflowY: "auto",
              overflowX: "auto",
              bgcolor: "#eef2f7",
              scrollbarGutter: { md: "stable" },
            }}
          >
            {children}
            <Box sx={{ height: 24 }} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
