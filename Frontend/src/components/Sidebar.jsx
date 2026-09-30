import { useEffect, useState } from "react";
import apiRequest from "../lib/api.js";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";

import PowerSettingsNewOutlinedIcon from "@mui/icons-material/PowerSettingsNewOutlined";

import sidebarConfig from "../lib/sidebarConfig.js";

export const DRAWER_WIDTH = 260;


// =========================================================
// NAV ITEM
// =========================================================

function NavItem({
  item,
  currentPage,
  onNavigate,
}) {
  const isActive = currentPage === item.page;

  

  return (
    <ListItemButton
      selected={isActive}
      onClick={() => onNavigate(item.page)}
      sx={{
        minHeight: 44,

        borderRadius: "10px",

        mx: 1.2,
        mb: 0.35,

        px: 1.5,
        py: 0.8,

        color: "#d6e2f1",

        "&.Mui-selected": {
          bgcolor: "#3478ed",
          color: "#ffffff",

          "&:hover": {
            bgcolor: "#3478ed",
          },
        },

        "&:not(.Mui-selected):hover": {
          bgcolor: "rgba(255,255,255,0.06)",
        },
      }}
    >
      {/* ICON */}

      <ListItemIcon
        sx={{
          minWidth: 34,
          color: "inherit",
          fontSize: 16,
        }}
      >
        {item.icon}
      </ListItemIcon>

      {/* NAME */}

      <ListItemText
        primary={item.label}
        slotProps={{
          primary: {
            fontSize: 12.5,
            fontWeight: 600,
            whiteSpace: "nowrap",
          },
        }}
      />

      {/* NEW BADGE */}

      {/* Shows the NEW badge using the original green sidebar design. */}
{item.badge && !item.badge.dot && (
  <Chip
    label={item.badge.text}
    size="small"
    sx={{
      // Keeps the badge compact like the original design.
      height: 19,

      // Forces the NEW badge to stay green even when the menu item is selected.
      bgcolor: "#18a879",

      // Keeps NEW text white.
      color: "#ffffff",

      // Keeps the compact text size and weight.
      fontSize: 9,
      fontWeight: 800,

      // Creates the rounded pill shape.
      borderRadius: "10px",

      // Prevents MUI hover/selected styles from changing the badge.
      "&:hover": {
        bgcolor: "#18a879",
      },

      // Controls horizontal spacing inside the badge.
      "& .MuiChip-label": {
        px: 0.8,
      },
    }}
  />
)}

      {/* NUMBER BADGE */}

      {item.badge && item.badge.dot && (
        <Box
          sx={{
            minWidth: 20,
            height: 20,

            px: 0.5,

            borderRadius: "50%",

            bgcolor: "#ef4444",
            color: "#fff",

            fontSize: 10,
            fontWeight: 700,

            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {item.badge.text}
        </Box>
      )}
    </ListItemButton>
  );
}


// =========================================================
// SIDEBAR
// =========================================================

export default function Sidebar({
  roleKey = "indexer",
  currentPage,
  onNavigate,
  onSignOut,
  mobileOpen = false,
  onMobileClose,
}) {
  // Stores the live unread notification count shown in the existing Notifications badge.
  const [notificationCount, setNotificationCount] = useState(0);

  // Stores the live pending correction/approval count for Team Lead, Core Team and Administrator.
  const [approvalCount, setApprovalCount] = useState(0);

  // Tracks whether the current user has at least one required guide that is still unacknowledged.
  const [hasNewGuide, setHasNewGuide] = useState(false);

  useEffect(() => {
    let active = true;

    // Loads every live sidebar badge that is relevant to the current role.
    const loadSidebarBadges = async () => {
      const requests = [];

      // Notifications are available to all application roles.
      requests.push(
        apiRequest("/notifications/my")
          .then((data) => {
            if (!active) return;
            setNotificationCount(Number(data.unreadCount || 0));
          })
          .catch((error) => {
            console.error("Sidebar notification count error:", error);
            if (active) setNotificationCount(0);
          })
      );

      // Team Lead, Core Team and Administrator use the existing approval summary for pending corrections.
      if (["teamLead", "coreTeam", "administrator"].includes(roleKey)) {
        requests.push(
          apiRequest("/team-lead/approvals/summary")
            .then((data) => {
              if (!active) return;
              setApprovalCount(Number(data.summary?.awaitingReview || 0));
            })
            .catch((error) => {
              console.error("Sidebar approval count error:", error);
              if (active) setApprovalCount(0);
            })
        );
      } else if (active) {
        setApprovalCount(0);
      }

      // Indexer and Team Lead show NEW only when a required guide still needs acknowledgement.
      if (["indexer", "teamLead"].includes(roleKey)) {
        requests.push(
          apiRequest("/guides/latest")
            .then((data) => {
              if (!active) return;

              const guideNeedsAcknowledgement = (data.guides || []).some((guide) => {
                const requiresAck =
                  guide.requires_ack === true || Number(guide.requires_ack) === 1;
                const acknowledged =
                  guide.acknowledged === true || Number(guide.acknowledged) === 1;

                return requiresAck && !acknowledged;
              });

              setHasNewGuide(guideNeedsAcknowledgement);
            })
            .catch((error) => {
              console.error("Sidebar guide badge error:", error);
              if (active) setHasNewGuide(false);
            })
        );
      } else if (active) {
        setHasNewGuide(false);
      }

      await Promise.allSettled(requests);
    };

    loadSidebarBadges();

    // Refreshes badges immediately when another page tells the sidebar that data changed.
    const handleBadgeRefresh = () => loadSidebarBadges();

    window.addEventListener(
      "prodtrack-notifications-updated",
      handleBadgeRefresh
    );
    window.addEventListener(
      "prodtrack-sidebar-badges-updated",
      handleBadgeRefresh
    );

    // Periodically refreshes counts so changes made elsewhere also appear without reloading the app.
    const refreshTimer = window.setInterval(loadSidebarBadges, 30000);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
      window.removeEventListener(
        "prodtrack-notifications-updated",
        handleBadgeRefresh
      );
      window.removeEventListener(
        "prodtrack-sidebar-badges-updated",
        handleBadgeRefresh
      );
    };
  }, [roleKey, currentPage]);

  // Keeps the original role-specific menu configuration unchanged except for live badge values.
  const baseMenuItems =
    sidebarConfig[roleKey] ||
    sidebarConfig.indexer;

  // Injects live badge data into the existing menu items without changing any sidebar UI/styling.
  const menuItems = baseMenuItems.map((item) => {
    if (item.page === "notifications") {
      return {
        ...item,
        badge:
          notificationCount > 0
            ? {
                dot: true,
                text: String(notificationCount),
                color: "error",
              }
            : null,
      };
    }

    if (item.page === "corrections") {
      return {
        ...item,
        badge:
          approvalCount > 0
            ? {
                dot: true,
                text: String(approvalCount),
                color: "error",
              }
            : null,
      };
    }

    if (item.page === "indexing-guide") {
      return {
        ...item,
        badge: hasNewGuide
          ? {
              text: "NEW",
              color: "success",
            }
          : null,
      };
    }

    return item;
  });

  const handleNavigate = (page) => {
    onNavigate(page);
    onMobileClose?.();
  };

  const drawerContent = (
    <>
      {/* ==================================================
          LOGO
      ================================================== */}

      <Box
        sx={{
          height: 64,

          display: "flex",
          alignItems: "center",

          gap: 1.2,

          px: 2,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,

            borderRadius: "9px",

            background:
              "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",

            display: "flex",
            alignItems: "center",
            justifyContent: "center",

            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              width: 21,
              height: 21,

              bgcolor: "#fff",

              clipPath:
                "polygon(0 0, 55% 0, 55% 45%, 100% 45%, 100% 100%, 45% 100%, 45% 55%, 0 55%)",
            }}
          />
        </Box>

        <Typography
          sx={{
            color: "#ffffff",

            fontWeight: 800,

            fontSize: 17,

            letterSpacing: "-0.02em",

            whiteSpace: "nowrap",
          }}
        >
          ProdTrack
        </Typography>
      </Box>


      {/* ==================================================
          MENU TITLE
      ================================================== */}

      <Typography
        sx={{
          color: "#7fa4d7",

          fontSize: 10,
          fontWeight: 700,

          letterSpacing: 0.8,

          px: 2.2,

          mt: 2.2,
          mb: 0.8,
        }}
      >
        MENU
      </Typography>


      {/* ==================================================
          ROLE-SPECIFIC MENU
      ================================================== */}

      <List
  sx={{
    py: 0,
    flex: "1 1 auto",
    minHeight: 0,

    // Keeps vertical scrolling enabled.
    overflowY: "auto",
    overflowX: "hidden",

    // Hides the scrollbar in Firefox while keeping scrolling enabled.
    scrollbarWidth: "none",

    // Hides the scrollbar in older Microsoft browsers.
    msOverflowStyle: "none",

    // Hides the scrollbar in Chrome, Edge, and Safari.
    "&::-webkit-scrollbar": {
      display: "none",
    },
  }}

      >
        {menuItems.map((item) => (
          <NavItem
            key={item.page}
            item={item}
            currentPage={currentPage}
            onNavigate={handleNavigate}
          />
        ))}
      </List>


      {/* ==================================================
          ACCOUNT
      ================================================== */}

      <Typography
        sx={{
          color: "#7fa4d7",

          fontSize: 10,
          fontWeight: 700,

          letterSpacing: 0.8,

          px: 2.2,

          mt: 1.5,
          mb: 0.7,
        }}
      >
        ACCOUNT
      </Typography>


      {/* ==================================================
          SIGN OUT
      ================================================== */}

      <List sx={{ py: 0 }}>
        <ListItemButton
          onClick={onSignOut}
          sx={{
            minHeight: 42,

            borderRadius: "10px",

            mx: 1.2,

            px: 1.5,
            py: 0.8,

            color: "#d6e2f1",

            "&:hover": {
              bgcolor: "rgba(255,255,255,0.06)",
            },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 34,
              color: "#a8bbd2",
            }}
          >
            <PowerSettingsNewOutlinedIcon
              sx={{
                fontSize: 17,
              }}
            />
          </ListItemIcon>

          <ListItemText
            primary="Sign out"
            slotProps={{
              primary: {
                fontSize: 12.5,
                fontWeight: 600,
              },
            }}
          />
        </ListItemButton>
      </List>
    </>
  );

  return (
    <>
      {/* MOBILE / TABLET — slides in over content, closes on backdrop click */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            bgcolor: "#10253f",
            border: "none",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* DESKTOP — always visible */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            bgcolor: "#10253f",
            border: "none",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
}
