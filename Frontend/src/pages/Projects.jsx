import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  LinearProgress,
  Grid,
} from "@mui/material";
import { useEffect, useState } from "react";
import apiRequest from "../lib/api.js";

// const projects = [
//   {
//     name: "ABC Medical Imaging",
//     client: "ABC",
//     reporting: "Indexing",
//     received: "1,250",
//     backlog: 62,
//   },
//   {
//     name: "Ortho Kids",
//     client: "Ortho",
//     reporting: "Indexing",
//     received: "880",
//     backlog: 44,
//   },
//   {
//     name: "Spine Indexing",
//     client: "Spine",
//     reporting: "Indexing",
//     received: "1,020",
//     backlog: 58,
//   },
//   {
//     name: "Cardio Records",
//     client: "Cardio",
//     reporting: "Indexing",
//     received: "640",
//     backlog: 30,
//   },
// ];

export default function Projects({ user, roleLabel = "Indexer", onNavigate }) {
  const [projects, setProjects] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await apiRequest("/projects/my");

    const projectList = Array.isArray(
  data.projects
)
  ? data.projects
  : [];

    const formattedProjects =
      projectList.map((project) => {
        const backlog = Math.min(
          100,
          Math.max(
            0,
            Number(
              project.backlog_percentage || 0
            )
          )
        );

        return {
          id: project.project_id || project.id,
          name:
            project.project_name ||
            "Unnamed project",

          client:
            project.client_name ||
            project.project_code ||
            "Not available",

          reporting:
            project.reporting_category ||
            "Not assigned",

          status:
            project.status || "active",

          received: Number(
            project.total_received || 0
          ).toLocaleString(),

          backlog,
        };
      });

        setProjects(formattedProjects);
      } catch (requestError) {
        console.error("Projects loading error:", requestError);
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  const visibleProjects = projects;
  return (
    <Box
      sx={{
        width: "100%",
      }}
    >
      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 2.5,
        }}
      >
        <Box>
          <Typography
            sx={{
              color: "#6b7b91",
              fontSize: 13,
              mb: 0.7,
            }}
          >
            ProdTrack · {roleLabel}
          </Typography>

          <Typography
            sx={{
              fontSize: 25,
              lineHeight: 1.2,
              fontWeight: 800,
              color: "#17233a",
            }}
          >
            Projects
          </Typography>

          <Typography
            sx={{
              mt: 0.8,
              color: "#718096",
              fontSize: 14,
            }}
          >
            Projects assigned to you and their current status.
          </Typography>
        </Box>
      </Box>

      {/* =================================================
          PROJECT CARDS
      ================================================= */}
      {loading && (
        <Card
          elevation={0}
          sx={{
            p: 3,
            mb: 2,
            border: "1px solid #dce3ec",
            borderRadius: "13px",
          }}
        >
          <Typography
            sx={{
              color: "#718096",
              fontSize: 14,
            }}
          >
            Loading projects...
          </Typography>
        </Card>
      )}

      {!loading && error && (
        <Card
          elevation={0}
          sx={{
            p: 3,
            mb: 2,
            border: "1px solid #fecaca",
            borderRadius: "13px",
            bgcolor: "#fff7f7",
          }}
        >
          <Typography
            sx={{
              color: "#dc2626",
              fontSize: 14,
            }}
          >
            {error}
          </Typography>
        </Card>
      )}

      {!loading &&
        !error &&
        visibleProjects.length === 0 && (
          <Card
            elevation={0}
            sx={{
              p: 3,
              mb: 2,
              border: "1px solid #dce3ec",
              borderRadius: "13px",
            }}
          >
            <Typography
              sx={{
                color: "#718096",
                fontSize: 14,
              }}
            >
              No projects are available.
            </Typography>
          </Card>
        )}
      <Grid container spacing={2.25}>
      {!loading &&
        !error &&
        visibleProjects.map((project) => (
          <Grid
            key={project.id}
            size={{
              xs: 12,
              md: 4,
            }}
          >
            <Card
              elevation={0}
              sx={{
                height: "100%",

                border: "1px solid #dce3ec",

                borderRadius: "13px",

                boxShadow:
                  "0 4px 12px rgba(15, 23, 42, 0.06)",

                backgroundColor: "#fff",
              }}
            >
              <CardContent
                sx={{
                  p: 2.25,

                  "&:last-child": {
                    pb: 2.25,
                  },
                }}
              >
                {/* ================= TITLE ================= */}

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 17,
                      fontWeight: 800,
                      color: "#17233a",
                    }}
                  >
                    {project.name}
                  </Typography>

                  <Chip
                    label={project.status?.toUpperCase() || "ACTIVE"}
                    size="small"
                    sx={{
                      height: 25,

                      backgroundColor: "#e4f6ee",

                      color: "#11835b",

                      fontSize: 11,
                      fontWeight: 800,

                      "& .MuiChip-label": {
                        px: 1.1,
                      },
                    }}
                  />
                </Box>

                {/* ================= CLIENT ================= */}

                <Typography
                  sx={{
                    mt: 1,

                    fontSize: 13,

                    color: "#718096",
                  }}
                >
                  Client: {project.client} · Reporting:{" "}
                  {project.reporting}
                </Typography>

                {/* ================= STATS ================= */}

                <Box
                  sx={{
                    display: "flex",
                    gap: 4,
                    mt: 2.2,
                  }}
                >
                  {/* RECEIVED */}

                  <Box>
                    <Typography
                      sx={{
                        fontSize: 11,

                        color: "#718096",

                        mb: 0.35,
                      }}
                    >
                      Received
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 21,

                        fontWeight: 800,

                        color: "#17233a",
                      }}
                    >
                      {project.received}
                    </Typography>
                  </Box>

                  {/* BACKLOG */}

                  <Box>
                    <Typography
                      sx={{
                        fontSize: 11,

                        color: "#718096",

                        mb: 0.35,
                      }}
                    >
                      Backlog %
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 21,

                        fontWeight: 800,

                        color: "#dc911d",
                      }}
                    >
                      {project.backlog}%
                    </Typography>
                  </Box>
                </Box>

                {/* ================= PROGRESS ================= */}

                <LinearProgress
                  variant="determinate"
                  value={project.backlog}
                  sx={{
                    mt: 1.8,

                    height: 9,

                    borderRadius: 5,

                    backgroundColor: "#edf1f6",

                    "& .MuiLinearProgress-bar": {
                      borderRadius: 5,

                      background:
                        "linear-gradient(90deg, #2f6df6 0%, #7950d8 100%)",
                    },
                  }}
                />

                {/* ================= BUTTON ================= */}

                <Button
                  fullWidth
                  variant="outlined"
                   onClick={() => {
                    const canEnterProduction =
                      user?.roleKey === "indexer" ||
                      user?.roleKey === "teamLead";

                    onNavigate?.(
                      canEnterProduction
                        ? "daily-entry"
                        : "reports"
                    );
                  }}
                  sx={{
                    mt: 1.8,

                    height: 34,

                    justifyContent: "flex-start",

                    px: 1.25,

                    textTransform: "none",

                    borderRadius: "8px",

                    color: "#19345b",

                    borderColor: "#d8e0ea",

                    fontSize: 13,

                    "&:hover": {
                      borderColor: "#2f6df6",

                      backgroundColor: "#f7faff",
                    },
                  }}
                >
                  {user?.roleKey === "indexer" ||
                    user?.roleKey === "teamLead"
                      ? "Open daily entry"
                      : "View project reports"}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
