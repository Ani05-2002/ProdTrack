import { useEffect, useState } from "react";
import apiRequest from "../lib/api.js";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import InputBase from "@mui/material/InputBase";
import IconButton from "@mui/material/IconButton";
import Badge from "@mui/material/Badge";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";

import SearchIcon from "@mui/icons-material/Search";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";


const GLOBAL_SEARCH_GROUPS = [
  {
    type: "user",
    label: "Employees",
  },
  {
    type: "project",
    label: "Projects",
  },
  {
    type: "statement",
    label: "Daily Work Statements",
  },
];

export default function Header({
  userName = "Priya Sharma",
  role = "Indexer",
  roleKey,
  notificationCount = 0,
  onLogout,
  onNotifications,
  onHelp,
  onMenuClick,
  onProfileClick,
  onNavigate,
}) {
  // Builds user initials for the existing avatar.
  const initials = userName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Stores the live unread notification count.
  const [liveNotificationCount, setLiveNotificationCount] =
    useState(notificationCount);

  // Stores the current text typed in the global search box.
  const [searchQuery, setSearchQuery] = useState("");

  // Stores matching project, user, and entry results from the backend.
  const [searchResults, setSearchResults] = useState([]);

  // Tracks whether the global search API is currently loading.
  const [searchLoading, setSearchLoading] = useState(false);

  // Controls whether the search result dropdown is visible.
  const [searchOpen, setSearchOpen] = useState(false);

  const [searchError, setSearchError] = useState("");


  const searchRole = String(roleKey || role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  const isIndexer = searchRole === "indexer";

  const isTeamLead = [
    "lead",
    "teamlead",
    "teamleader",
  ].includes(searchRole);

  const isManagement = [
    "core",
    "coreteam",
    "manager",
    "assistantmanager",
    "operationsmanager",
    "admin",
    "administrator",
  ].includes(searchRole);

  const canSearch = isTeamLead || isManagement;


  // Close global search when another page opens a form.
  // Close global search when another form opens.
  useEffect(() => {
    // Reset the search popup and its contents.
    const closeSearch = () => {
      setSearchOpen(false);
      setSearchQuery("");
      setSearchResults([]);
      setSearchLoading(false);
    };

    // Listen for the Add User form opening.
    window.addEventListener(
      "prodtrack-close-search",
      closeSearch
    );

    // Remove the listener when Header unmounts.
    return () => {
      window.removeEventListener(
        "prodtrack-close-search",
        closeSearch
      );
    };
  }, []);
  // =========================================================
  // LOAD NOTIFICATION COUNT
  // =========================================================

  useEffect(() => {
    // Loads unread notifications for supported roles.
    const loadNotificationCount = async () => {
      // Normalizes the role name for comparison.
      const normalizedRole = String(role || "")
        .replace(/\s+/g, "")
        .toLowerCase();

      // Stops the request for unsupported roles.
      if (
        ![
          "indexer",
          "teamlead",
          "coreteam",
          "administrator",
        ].includes(normalizedRole)
      ) {
        return;
      }

      try {
        // Calls the existing notifications API.
        const data = await apiRequest(
          "/notifications/my"
        );

        // Stores the returned unread count.
        setLiveNotificationCount(
          Number(data.unreadCount || 0)
        );
      } catch (error) {
        // Logs notification count errors.
        console.error(
          "Header notification count error:",
          error
        );
      }
    };

    // Loads notification count when Header mounts.
    loadNotificationCount();

    // Reloads notification count when another component updates notifications.
    window.addEventListener(
      "prodtrack-notifications-updated",
      loadNotificationCount
    );

    // Removes the notification event listener when Header unmounts.
    return () => {
      window.removeEventListener(
        "prodtrack-notifications-updated",
        loadNotificationCount
      );
    };
  }, [role]);

  // =========================================================
  // GLOBAL BASIC SEARCH
  // =========================================================

  // Search only for management roles, with a short debounce.
  useEffect(() => {
    const trimmedQuery = searchQuery.trim();

    if (!canSearch || trimmedQuery.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      setSearchLoading(false);
      setSearchError("");
      return;
    }

    let cancelled = false;
    const searchTimer = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError("");
      setSearchOpen(
        document.activeElement ===
        document.getElementById("global-search-input")
      );

      try {

        const data = await apiRequest(
          `/search?q=${encodeURIComponent(trimmedQuery)}`
        );

        if (cancelled) return;

        // Show only Employees, Projects and Daily Work Statements.
        setSearchResults(
          Array.isArray(data?.results)
            ? data.results.filter(
              (result) =>
                result.type === "user" ||
                result.type === "project" ||
                result.type === "statement"
            )
            : []
        );

        setSearchOpen(
          document.activeElement ===
          document.getElementById("global-search-input")
        );

        setSearchOpen(
          document.activeElement ===
          document.getElementById("global-search-input")
        );
      } catch (error) {
        if (cancelled) return;
        setSearchResults([]);
        setSearchError(error?.message || "Search unavailable.");
        setSearchOpen(
          document.activeElement ===
          document.getElementById("global-search-input")
        );
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(searchTimer);
    };
  }, [searchQuery, canSearch]);

  // =========================================================
  // NOTIFICATION ICON CLICK
  // =========================================================

  const handleNotificationIconClick =
    async () => {
      try {
        // Only marks notifications as read when unread notifications exist.
        if (liveNotificationCount > 0) {
          await apiRequest(
            "/notifications/read-all",
            {
              method: "PATCH",
            }
          );

          // Removes Header notification badge immediately.
          setLiveNotificationCount(0);

          // Tells Sidebar to reload its notification badge.
          window.dispatchEvent(
            new Event(
              "prodtrack-notifications-updated"
            )
          );
        }
      } catch (error) {
        // Logs mark-all-read errors.
        console.error(
          "Mark all notifications error:",
          error
        );
      } finally {
        // Opens the Notifications page.
        onNotifications?.();
      }
    };

  // Pass the exact selected record to the destination page.
  const handleSearchResultClick = (result) => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);

    if (!canSearch || !result?.type) return;

    const selection = {
      source: "global-search",
      resultType: result.type,
      resultId: result.id,
      productionDate: result.productionDate || null,
    };

    if (result.type === "statement") {
      onNavigate?.("reports", {
        ...selection,
        reportTab: "statements",
        statementId: result.id,
      });
      return;
    }

    if (result.type === "user") {
      onNavigate?.(isTeamLead ? "my-team" : "users", selection);
      return;
    }


    if (result.type === "project") {
      if (isTeamLead) {
        // Open Team Lead Daily Entry with the
        // exact project selected from Global Search.
        onNavigate?.("daily-entry", {
          ...selection,
          projectId: result.id,
          projectName: result.title,
        });
      } else {
        // Keep Manager and Admin navigation unchanged.
        onNavigate?.("project-master", {
          ...selection,
          projectId: result.id,
          projectName: result.title,
        });
      }

      return;
    }


    if (result.type === "entry") {
      onNavigate?.(isTeamLead ? "daily-entry" : "reports", selection);
    }
  };

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        bgcolor: "navy.main",
        height: 64,
        justifyContent: "center",
      }}
    >
      <Toolbar
        disableGutters
        sx={{
          minHeight: "64px !important",

          // SAME START POSITION AS MAIN CONTENT
          px: 0,

          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* ================= LEFT ================= */}

        <Box
          sx={{
            pl: 0.5,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <IconButton
            onClick={onMenuClick}
            sx={{
              display: {
                xs: "flex",
                md: "none",
              },
              color: "#e2e8f0",
              mr: 0.5,
            }}
          >
            <Box
              component="svg"
              viewBox="0 0 24 24"
              sx={{
                width: 22,
                height: 22,
                fill: "none",
              }}
            >
              <path
                d="M4 6h16M4 12h16M4 18h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </Box>
          </IconButton>

          <Box>
            <Typography
              sx={{
                color: "#fff",
                fontWeight: 700,
                fontSize: 16,
                lineHeight: 1.15,
              }}
            >
              Welcome, {userName}
            </Typography>

            <Typography
              sx={{
                color: "#94a3b8",
                fontSize: 12,
                lineHeight: 1.2,
                mt: 0.2,
              }}
            >
              {role}
            </Typography>
          </Box>
        </Box>

        {/* ================= RIGHT ================= */}

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: {
              xs: 0.6,
              sm: 1.2,
            },
            pr: {
              xs: 1,
              sm: 2.5,
            },
          }}
        >
          {/* SEARCH — hidden below md */}

          <Box
            sx={{
              display: {
                xs: "none",
                md: isIndexer ? "none" : "flex",
              },

              width: {
                md: 200,
                lg: 294,
              },

              height: 40,

              // Lets the result dropdown stay directly below the existing search box.
              position: "relative",

              alignItems: "center",

              bgcolor: "#24364f",

              border: "1px solid #3b4d65",

              borderRadius: "10px",

              px: 1.4,

              boxSizing: "border-box",

              "&:hover": {
                bgcolor: "#293c55",
              },
            }}
          >
            <SearchIcon
              sx={{
                color: "#94a3b8",
                fontSize: 18,
                mr: 1,
              }}
            />

            <InputBase
              id="global-search-input"
              placeholder="Search employees, projects, entries, statements..."

              // Connects the existing input to the global search state.
              value={searchQuery}

              // Updates the search state whenever the user types.
              onChange={(event) => {
                setSearchQuery(
                  event.target.value
                );
              }}

              // Reopens existing results when the user focuses the search box again.

              // Open search results only when there is a search query.
              onFocus={() => {
                if (searchQuery.trim().length >= 2) {
                  setSearchOpen(true);
                }
              }}
              // Close search results when the search input loses focus.
              onBlur={() => {
                setSearchOpen(false);
              }}

              sx={{
                width: "100%",

                color: "#e2e8f0",

                fontSize: 14,

                "& input::placeholder": {
                  color: "#a6b4c7",
                  opacity: 1,
                },
              }}
            />

            {/* GLOBAL SEARCH RESULT DROPDOWN */}

            {searchOpen && (
              <Box
                sx={{
                  // Positions results directly below the original search bar.
                  position: "absolute",

                  top: 46,
                  left: 0,

                  width: "100%",

                  maxHeight: 320,

                  overflowY: "auto",

                  bgcolor: "#ffffff",

                  border:
                    "1px solid #dbe3ec",

                  borderRadius: "10px",

                  boxShadow:
                    "0 12px 30px rgba(15, 23, 42, 0.18)",

                  zIndex: 1500,
                }}
              >
                {/* Shows the loading message while searching. */}
                {searchLoading && (
                  <Typography
                    sx={{
                      px: 1.5,
                      py: 1.2,
                      fontSize: 13,
                      color: "#64748b",
                    }}
                  >
                    Searching...
                  </Typography>
                )}

                {!searchLoading && searchError && (
                  <Typography sx={{ px: 1.5, py: 1.2, fontSize: 13, color: "#b91c1c" }}>
                    {searchError}
                  </Typography>
                )}

                {/* Shows a message when no results match the search. */}
                {!searchLoading &&
                  !searchError &&
                  searchResults.length ===
                  0 && (
                    <Typography
                      sx={{
                        px: 1.5,
                        py: 1.2,
                        fontSize: 13,
                        color: "#64748b",
                      }}
                    >
                      No results found
                    </Typography>
                  )}

                {/* Group results by type while preserving the existing dropdown. */}
                {!searchLoading && !searchError &&
                  GLOBAL_SEARCH_GROUPS.map((group) => {
                    const matches = searchResults.filter(
                      (result) => result.type === group.type
                    );
                    if (!matches.length) return null;

                    return (
                      <Box key={group.type}>
                        <Typography sx={{ px: 1.5, py: 0.8, bgcolor: "#f1f5f9", color: "#475569", fontSize: 11, fontWeight: 700 }}>
                          {group.label}
                        </Typography>
                        {matches.map((result) => (
                          <Box
                            key={`${result.type}-${result.id}`}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleSearchResultClick(result)}
                            sx={{ px: 1.5, py: 1, cursor: "pointer", borderBottom: "1px solid #eef2f7", "&:hover": { bgcolor: "#f8fafc" } }}
                          >
                            <Typography sx={{ color: "#0f172a", fontSize: 13, fontWeight: 600 }}>
                              {result.title || `${result.type} #${result.id}`}
                            </Typography>
                            <Typography sx={{ color: "#64748b", fontSize: 11, mt: 0.2 }}>
                              {result.code || ""}
                              {result.status ? ` · ${result.status}` : ""}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    );
                  })}
              </Box>
            )}
          </Box>

          {/* SEARCH ICON ONLY — shown below md */}

          <IconButton
            sx={{
              display: {
                xs: isIndexer ? "none" : "flex",
                md: "none",
              },

              width: 42,
              height: 42,

              bgcolor: "#1e3149",

              borderRadius: "9px",

              "&:hover": {
                bgcolor: "#293d57",
              },
            }}
          >
            <SearchIcon
              sx={{
                color: "#94a3b8",
                fontSize: 19,
              }}
            />
          </IconButton>

          {/* NOTIFICATIONS */}

          <IconButton
            onClick={
              handleNotificationIconClick
            }
            sx={{
              width: 42,
              height: 42,

              bgcolor: "#1e3149",

              borderRadius: "9px",

              "&:hover": {
                bgcolor: "#293d57",
              },
            }}
          >
            <Badge
              badgeContent={
                liveNotificationCount
              }
              invisible={
                liveNotificationCount ===
                0
              }
              color="error"
              sx={{
                "& .MuiBadge-badge": {
                  fontSize: 10,
                  fontWeight: 700,
                  minWidth: 17,
                  height: 17,
                },
              }}
            >
              <NotificationsRoundedIcon
                sx={{
                  color: "#fbbf24",
                  fontSize: 19,
                }}
              />
            </Badge>
          </IconButton>

          {/* HELP — hidden on xs */}

          <IconButton
            onClick={onHelp}
            sx={{
              display: {
                xs: "none",
                sm: "flex",
              },

              width: 42,
              height: 42,

              bgcolor: "#1e3149",

              borderRadius: "9px",

              "&:hover": {
                bgcolor: "#293d57",
              },
            }}
          >
            <HelpOutlineRoundedIcon
              sx={{
                color: "#e2e8f0",
                fontSize: 19,
              }}
            />
          </IconButton>

          {/* AVATAR */}

          <Avatar
            onClick={onProfileClick}
            sx={{
              width: 42,
              height: 42,

              bgcolor: "#6366f1",

              fontSize: 13,
              fontWeight: 700,

              cursor: "pointer",
            }}
          >
            {initials}
          </Avatar>

          {/* LOGOUT */}

          <Button
            onClick={onLogout}
            variant="outlined"
            sx={{
              height: 40,

              px: {
                xs: 1,
                sm: 1.8,
              },

              minWidth: "auto",

              color: "#dbeafe",

              borderColor: "#40516a",

              borderRadius: "8px",

              fontSize: 13,

              fontWeight: 400,

              textTransform: "none",

              bgcolor: "transparent",

              "&:hover": {
                bgcolor: "#1e3149",
                borderColor: "#536985",
              },
            }}
          >
            <Box
              component="span"
              sx={{
                display: {
                  xs: "none",
                  sm: "inline",
                },
              }}
            >
              Logout
            </Box>

            <Box
              component="span"
              sx={{
                display: {
                  xs: "inline",
                  sm: "none",
                },
              }}
            >
              ⏻
            </Box>
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}