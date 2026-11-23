
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import {
  createUniver,
  LocaleType,
  mergeLocales,
} from "@univerjs/presets";

import {
  UniverSheetsCorePreset,
} from "@univerjs/preset-sheets-core";

import UniverSheetsEnUS from "@univerjs/preset-sheets-core/locales/en-US";

import "@univerjs/preset-sheets-core/lib/index.css";

const SpreadsheetEditor = forwardRef(
  function SpreadsheetEditor(
    {
      initialWorkbook = null,
      readOnly = false,
      height = 600,
    },
    ref
  ) {
    const containerRef = useRef(null);
    const workbookRef = useRef(null);

    const [error, setError] = useState("");

    // ========================================================
    // PUBLIC METHODS FOR SAVE, SUBMIT AND EXPORT
    // ========================================================

    useImperativeHandle(
      ref,
      () => ({
        isReady() {
          return workbookRef.current !== null;
        },

        async getWorkbookData() {
          const workbook = workbookRef.current;

          if (!workbook) {
            throw new Error(
              "Spreadsheet is not ready."
            );
          }

          // Save the currently edited cell before
          // retrieving the complete workbook.

          if (workbook.isCellEditing()) {
            const saved =
              await workbook.endEditingAsync(true);

            if (!saved) {
              throw new Error(
                "Unable to finish editing the current cell."
              );
            }
          }

          return structuredClone(workbook.save());
        },
      }),
      []
    );

    // ========================================================
    // INITIALIZE UNIVER SHEETS
    // ========================================================

    useEffect(() => {
      const host = containerRef.current;

      if (!host) return;

      setError("");

      // Separate container for each editor instance.

      const container =
        document.createElement("div");

      container.style.width = "100%";
      container.style.height = "100%";

      host.appendChild(container);

      let univer;

      try {
        const instance = createUniver({
          locale: LocaleType.EN_US,

          locales: {
            [LocaleType.EN_US]: mergeLocales(
              UniverSheetsEnUS
            ),
          },

          presets: [
            UniverSheetsCorePreset({
              container,
            }),
          ],
        });

        univer = instance.univer;

        // Load a saved workbook or create a blank workbook.

        const workbook =
          instance.univerAPI.createWorkbook(
            initialWorkbook
              ? structuredClone(initialWorkbook)
              : {
                  name: "Daily Work Statement",
                }
          );

        // Management and submitted statements
        // will use read-only mode.

        if (readOnly) {
          workbook.setEditable(false);
        }

        workbookRef.current = workbook;

      } catch (err) {
        workbookRef.current = null;

        console.error(
          "Spreadsheet initialization failed:",
          err
        );

        setError(
          "Unable to open the spreadsheet. Please reload the page."
        );
      }

      // ======================================================
      // CLEANUP
      // ======================================================

      return () => {
        workbookRef.current = null;

        // Dispose after React finishes its cleanup.

        queueMicrotask(() => {
          try {
            univer?.dispose();
          } finally {
            container.remove();
          }
        });
      };
    }, [initialWorkbook, readOnly]);

    // ========================================================
    // SPREADSHEET UI
    // ========================================================

    return (
      <div
        style={{
          width: "100%",
          minWidth: 0,
          backgroundColor: "#ffffff",
          border:
            "1px solid rgba(148, 163, 184, 0.35)",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        {readOnly && (
          <div
            style={{
              padding: "8px 12px",
              color: "#475569",
              background: "#f1f5f9",
              fontSize: 13,
            }}
          >
            Read-only workbook
          </div>
        )}

        {error && (
          <div
            role="alert"
            style={{
              padding: 16,
              color: "#b91c1c",
            }}
          >
            {error}
          </div>
        )}

        <div
          ref={containerRef}
          style={{
            width: "100%",
            height,
            display: error ? "none" : "block",
          }}
        />
      </div>
    );
  }
);

export default SpreadsheetEditor;
