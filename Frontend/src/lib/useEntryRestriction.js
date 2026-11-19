
import { useEffect, useState } from "react";
import { apiRequest } from "./api.js";

export function useEntryRestriction(
  productionDate,
  editingEntryId
) {
  const key =
    `${productionDate || ""}:` +
    `${editingEntryId ?? ""}`;

  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!productionDate) return;

    let active = true;
    let running = false;

    // Check whether the Indexer can save daily entries.
    const check = async () => {
      if (!active || running) return;

      running = true;

      try {
        const params = new URLSearchParams({
          date: productionDate,
        });

        // Include the existing entry ID when editing.
        if (editingEntryId != null) {
          params.set(
            "entryId",
            String(editingEntryId)
          );
        }

        const data = await apiRequest(
          `/daily-entries/restriction-status?${params}`,
          {
            cache: "no-store",
          }
        );

        if (
          !data.success ||
          typeof data.blocked !== "boolean"
        ) {
          throw new Error(
            "Invalid restriction response."
          );
        }

        if (active) {
          setResult({
            key,
            blocked: data.blocked,
            message: data.message || "",
            error: "",
          });
        }
      } catch (err) {
        if (active) {
          setResult({
            key,
            blocked: true,
            message: "",
            error:
              err.message ||
              "Unable to verify entry access.",
          });
        }
      } finally {
        running = false;
      }
    };

    // Check permissions immediately.
    check();

    // Refresh permissions every 15 seconds.
    const timer = window.setInterval(
      check,
      15000
    );

    // Recheck when the employee returns to the browser.
    window.addEventListener("focus", check);

    return () => {
      active = false;

      window.clearInterval(timer);

      window.removeEventListener(
        "focus",
        check
      );
    };
  }, [productionDate, editingEntryId, key]);

  // Prevent saving until permissions are verified.
  if (result?.key !== key) {
    return {
      checking: true,
      blocked: true,
      message: "",
      error: "",
    };
  }

  return {
    ...result,
    checking: false,
  };
}
