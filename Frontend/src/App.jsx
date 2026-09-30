import {
  useCallback,
  useEffect,
  useState,
} from "react";
import SignIn from "./components/SignIn.jsx";
import GuideUpdateModal from "./components/GuideUpdateModal.jsx";
import DashboardLayout from "./Layouts/DashboardLayout.jsx";
import AppRoutes from "./routes/AppRoutes.jsx";
import { useToast } from "./components/ToastProvider.jsx";
import { apiRequest, AUTH_EVENT } from "./lib/api.js";

const getStoredUser = () => {
  const storedUser =
    localStorage.getItem("prodtrackUser") ||
    sessionStorage.getItem("prodtrackUser");

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    return null;
  }
};

export default function App() {
  const [user, setUser] = useState(getStoredUser);
  const [page, setPage] = useState("dashboard");
   // Stores the exact item selected from the global search.
  const [searchSelection, setSearchSelection] = useState(null);

  // Stores the pending guide object returned by /api/guides/pending-ack.
  // null  → not fetched yet or no pending guide.
  // object → a guide is waiting for acknowledgement, open the modal.
  const [pendingGuide, setPendingGuide] = useState(null);
  const toast = useToast();

  // Fetches the pending-ack guide for indexer users and opens the modal
  // when one is found. Called on login and when "Review now" is clicked.
  const fetchPendingGuide = useCallback(async () => {
    try {
      const data = await apiRequest("/guides/pending-ack");
      // Only store when the backend says there is a pending guide.
      if (data.success && data.hasPending && data.guide) {
        setPendingGuide(data.guide);
      } else {
        setPendingGuide(null);
      }
    } catch {
      // Silently ignore — the modal simply won't open on error.
      setPendingGuide(null);
    }
  }, []);

  const login = (authenticatedUser) => {
    setUser(authenticatedUser);
    setPage("dashboard");
    // Trigger the pending-guide fetch only for indexers.
    if (authenticatedUser?.roleKey === "indexer") {
      fetchPendingGuide();
    }
  };

const logout = useCallback(() => {
  localStorage.removeItem("prodtrackToken");
  localStorage.removeItem("prodtrackUser");

  sessionStorage.removeItem("prodtrackToken");
  sessionStorage.removeItem("prodtrackUser");

  localStorage.removeItem(
    "prodtrackSessionTimeout"
  );

  sessionStorage.removeItem(
    "prodtrackSessionTimeout"
  );

  setUser(null);
  setPage("dashboard");
  setPendingGuide(null);
}, []);



  useEffect(() => {
    const handleUnauthorized = () => {
      toast.info("Your session expired. Please sign in again.");
      logout();
    };

    window.addEventListener(AUTH_EVENT, handleUnauthorized);
    return () => {
      window.removeEventListener(AUTH_EVENT, handleUnauthorized);
    };
  }, [logout, toast]);

  useEffect(() => {
  if (!user) {
    return undefined;
  }

  const storage =
    localStorage.getItem("prodtrackUser")
      ? localStorage
      : sessionStorage;

  const configuredMinutes = Number(
    storage.getItem(
      "prodtrackSessionTimeout"
    )
  );

  const timeoutMinutes =
    [15, 30, 60].includes(
      configuredMinutes
    )
      ? configuredMinutes
      : 30;

  let timeoutId;

  const handleIdleLogout = () => {
    toast.info("Your session ended because of inactivity.");
    logout();
  };

  const resetIdleTimer = () => {
    window.clearTimeout(timeoutId);

    timeoutId = window.setTimeout(
      handleIdleLogout,
      timeoutMinutes * 60 * 1000
    );
  };

  const activityEvents = [
    "mousedown",
    "mousemove",
    "keydown",
    "scroll",
    "touchstart",
  ];
 
  activityEvents.forEach((eventName) => {
    window.addEventListener(
      eventName,
      resetIdleTimer,
      { passive: true }
    );
  });

  resetIdleTimer();

  return () => {
    window.clearTimeout(timeoutId);

    activityEvents.forEach(
      (eventName) => {
        window.removeEventListener(
          eventName,
          resetIdleTimer
        );
      }
    );
  };
}, [user, logout]);

if (!user) return <SignIn onLogin={login} />;

  return (
    <>
      <DashboardLayout
        user={user}
        currentPage={page}
        onNavigate={setPage}
        onLogout={logout}
      >
        <AppRoutes 
        user={user} currentPage={page} 
        onNavigate={setPage} 
        onReviewGuide={fetchPendingGuide}
        searchSelection={searchSelection} />
      </DashboardLayout>

      {user.roleKey === "indexer" && (
        <GuideUpdateModal
          open={Boolean(pendingGuide)}
          guide={pendingGuide}
          onClose={(acknowledged) => {
            setPendingGuide(null);
          }}
        />
      )}
    </>
  );
}
