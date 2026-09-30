import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
} from "@mui/material";
import apiRequest from "../lib/api.js";
import { useToast } from "../components/ToastProvider.jsx";

import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";


// =========================================================
// NOTIFICATIONS PAGE
// =========================================================

export default function Notifications({ user }) {

  const toast = useToast();
  const [notifications, setNotifications] =
    useState([]);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const data = await apiRequest(
          "/notifications/my"
        );
        // Marks all notifications as read when the page opens.
        await apiRequest("/notifications/read-all", {
          method: "PATCH",
        });

        // Tells the sidebar and header to refresh the unread count.
        window.dispatchEvent(
          new Event("prodtrack-notifications-updated")
        );

        const formattedNotifications = (
          data.notifications || []
        ).map((notification) => {
          const type = String(
            notification.type || ""
          ).toLowerCase();

          let Icon = ErrorOutlineRoundedIcon;
          let color = "#dc3545";

          if (type.includes("guide")) {
            Icon = MenuBookRoundedIcon;
            color = "#3478ed";
            // Shows the green tick for approved corrections and submitted daily entries.
          } else if (
            type.includes("approved") ||
            type.includes("entry_submission_confirmation")
          ) {
            Icon = CheckCircleRoundedIcon;
            color = "#20a36b";
          } else if (type.includes("backlog")) {
            Icon = TrendingUpRoundedIcon;
            color = "#8060d9";
          } else if (type.includes("lock")) {
            Icon = LockRoundedIcon;
            color = "#f59e0b";
          }

          const createdDate = new Date(
            notification.created_at
          );

          const differenceMinutes = Math.max(
            0,
            Math.floor(
              (Date.now() - createdDate.getTime()) /
              60000
            )
          );

          let time = "Just now";

          if (differenceMinutes >= 1440) {
            time =
              `${Math.floor(
                differenceMinutes / 1440
              )}d ago`;
          } else if (differenceMinutes >= 60) {
            time =
              `${Math.floor(
                differenceMinutes / 60
              )}h ago`;
          } else if (differenceMinutes > 0) {
            time = `${differenceMinutes}m ago`;
          }

          return {
            id:
              notification.notification_id ||
              notification.id,
            icon: Icon,
            color,
            title: notification.title,
            message: notification.message,
            time,
            isRead:true,
          };
        });

        setNotifications(formattedNotifications);
      } catch (error) {
        console.error(
          "Load Notifications Error:",
          error
        );
        toast.error(error.message);
      }
    };

    loadNotifications();
  }, [toast]);

  const handleNotificationClick = async (
    notificationId,
    isRead
  ) => {
    if (isRead) return;

    try {
      await apiRequest(
        `/notifications/${notificationId}/read`,
        {
          method: "PATCH",
        }
      );

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) =>
          notification.id === notificationId
            ? {
              ...notification,
              isRead: true,
            }
            : notification
        )
      );
      window.dispatchEvent(
        new Event("prodtrack-notifications-updated")
      );
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      {/* BREADCRUMB */}

      <Typography
        sx={{
          color: "#6A7585",
          fontSize: 12.5,
        }}
      >
        ProdTrack · {user?.role || "User"}
      </Typography>

      {/* PAGE TITLE */}

      <Typography
        sx={{
          fontSize: 22,
          fontWeight: 800,
          mt: 0.7,
          color: "#1A2434",
        }}
      >
        Notifications
      </Typography>

      {/* DESCRIPTION */}

      <Typography
        sx={{
          color: "#6A7585",
          fontSize: 13.5,
          mt: 0.4,
          mb: 2,
        }}
      >
        Email and system alerts. Reminders for entries, corrections and guide
        updates.
      </Typography>

      {/* NOTIFICATION CARD */}

      <Paper
        elevation={0}
        sx={{
          border: "1px solid #dbe3ec",
          borderRadius: 1.5,
          overflow: "hidden",
          boxShadow: "0 2px 6px rgba(16,35,61,.08)",
        }}
      >
        {notifications.map(
          (
            {
              id,
              icon: Icon,
              color,
              title,
              message,
              time,
              isRead,
            },
            index
          ) => (
            <Box
              key={id}
              onClick={() =>
                handleNotificationClick(id, isRead)
              }
              sx={{
                minHeight: 68,
                px: {
                  xs: 1.5,
                  sm: 2.2,
                },
                py: 1.35,
                display: "flex",
                alignItems: "center",
                gap: {
                  xs: 1.2,
                  sm: 1.8,
                },
                borderBottom:
                  index < notifications.length - 1
                    ? "1px solid #e3e8ef"
                    : "none",
              }}
            >
              {/* MUI ICON */}

              <Box
                sx={{
                  width: 30,
                  height: 30,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color,
                  flexShrink: 0,
                }}
              >
                <Icon
                  sx={{
                    fontSize: 23,
                  }}
                />
              </Box>

              {/* CONTENT */}

              <Box
                sx={{
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <Typography
                  sx={{
                    fontSize: 13.5,
                    fontWeight: 800,
                    color: "#1A2434",
                  }}
                >
                  {title}
                </Typography>

                <Typography
                  sx={{
                    fontSize: 12.5,
                    color: "#6A7585",
                    mt: 0.35,
                  }}
                >
                  {message}
                </Typography>
              </Box>

              {/* TIME */}

              <Typography
                sx={{
                  color: "#667085",
                  fontSize: 12,
                  whiteSpace: "nowrap",
                  alignSelf: "flex-start",
                  mt: 0.2,
                  flexShrink: 0,
                }}
              >
                {time}
              </Typography>
            </Box>
          )
        )}
      </Paper>
    </Box>
  );
}