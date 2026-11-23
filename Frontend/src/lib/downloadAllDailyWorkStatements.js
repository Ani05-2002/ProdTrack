
import ExcelJS from "exceljs";
import apiRequest from "./api.js";

const MAX_ROW = 1048576;
const MAX_COLUMN = 16384;

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// ============================================================
// GENERATE UNIQUE WORKSHEET NAME
// ============================================================

function uniqueWorksheetName(title, usedNames) {
  const base =
    String(title || "Indexer")
      .replace(/[\\/*?:\[\]]/g, " ")
      .replace(/[\x00-\x1f]/g, " ")
      .trim()
      .replace(/^'+|'+$/g, "") || "Indexer";

  let suffixNumber = 1;
  let candidate;

  do {
    const suffix =
      suffixNumber === 1
        ? ""
        : ` (${suffixNumber})`;

    candidate =
      `${base.slice(0, 31 - suffix.length)}${suffix}`;

    suffixNumber += 1;
  } while (
    usedNames.has(candidate.toLowerCase()) ||
    candidate.toLowerCase() === "history"
  );

  usedNames.add(candidate.toLowerCase());

  return candidate;
}

// ============================================================
// CONVERT UNIVER COLOR TO EXCEL COLOR
// ============================================================

function excelColor(value) {
  const raw =
    typeof value === "string"
      ? value
      : value?.rgb;

  const hex = String(raw || "").replace(/^#/, "");

  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return `FF${hex.toUpperCase()}`;
  }

  if (/^[0-9a-f]{8}$/i.test(hex)) {
    return hex.toUpperCase();
  }

  return undefined;
}

// ============================================================
// RESOLVE UNIVER CELL STYLE
// ============================================================

function resolveStyle(source, workbookStyles) {
  if (typeof source === "string") {
    return workbookStyles?.[source] || {};
  }

  return source && typeof source === "object"
    ? source
    : {};
}

// ============================================================
// APPLY CELL FORMATTING
// ============================================================

function applyCellStyle(target, style) {
  if (!style || !Object.keys(style).length) {
    return;
  }

  const font = {};

  if (style.ff) font.name = style.ff;
  if (style.fs > 0) font.size = style.fs;

  if (style.bl != null) {
    font.bold = Boolean(style.bl);
  }

  if (style.it != null) {
    font.italic = Boolean(style.it);
  }

  if (style.ul != null) {
    font.underline = Boolean(
      style.ul?.s ?? style.ul
    );
  }

  if (style.st != null) {
    font.strike = Boolean(
      style.st?.s ?? style.st
    );
  }

  const fontColor = excelColor(style.cl);

  if (fontColor) {
    font.color = {
      argb: fontColor,
    };
  }

  if (Object.keys(font).length) {
    target.font = font;
  }

  // Background color

  const fillColor = excelColor(style.bg);

  if (fillColor) {
    target.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: fillColor,
      },
    };
  }

  // Alignment

  const horizontal = {
    1: "left",
    2: "center",
    3: "right",
  }[style.ht];

  const vertical = {
    1: "top",
    2: "middle",
    3: "bottom",
  }[style.vt];

  if (
    horizontal ||
    vertical ||
    style.tb != null
  ) {
    target.alignment = {
      ...(horizontal
        ? { horizontal }
        : {}),

      ...(vertical
        ? { vertical }
        : {}),

      ...(style.tb === 3
        ? { wrapText: true }
        : {}),
    };
  }

  // Number formatting

  if (
    typeof style.n?.pattern === "string"
  ) {
    target.numFmt = style.n.pattern;
  }

  // Cell borders

  const sideNames = {
    t: "top",
    b: "bottom",
    l: "left",
    r: "right",
  };

  const borderStyles = {
    1: "thin",
    2: "hair",
    3: "dotted",
    4: "dashed",
    5: "dashDot",
    6: "dashDotDot",
    7: "double",
    8: "medium",
    9: "mediumDashed",
    10: "mediumDashDot",
    11: "mediumDashDotDot",
    12: "slantDashDot",
    13: "thick",
  };

  const border = {};

  for (
    const [key, side]
    of Object.entries(sideNames)
  ) {
    const setting = style.bd?.[key];

    if (
      !setting ||
      !borderStyles[setting.s]
    ) {
      continue;
    }

    border[side] = {
      style: borderStyles[setting.s],

      color: {
        argb:
          excelColor(setting.cl) ||
          "FF000000",
      },
    };
  }

  if (Object.keys(border).length) {
    target.border = border;
  }
}

// ============================================================
// CONVERT UNIVER CELL VALUE
// ============================================================

function cellValue(data) {
  const richText =
    data?.p?.body?.dataStream;

  if (typeof richText === "string") {
    return richText.replace(/\r\n$/, "");
  }

  if (data?.v == null) {
    return null;
  }

  if (data.t === 3) {
    return (
      data.v === true ||
      data.v === 1 ||
      data.v === "1"
    );
  }

  if (
    data.t === 1 ||
    data.t === 4
  ) {
    return String(data.v);
  }

  return data.v;
}

// ============================================================
// UPDATE SHEET NAMES IN FORMULAS
// ============================================================

function renameFormulaReferences(formula, names) {
  return formula.replace(
    /(?:'((?:[^']|'')+)'|([A-Za-z_][A-Za-z0-9_.]*))!/g,

    (match, quoted, unquoted) => {
      const original =
        quoted != null
          ? quoted.replace(/''/g, "'")
          : unquoted;

      const replacement =
        names.get(original.toLowerCase());

      return replacement
        ? `'${replacement.replace(/'/g, "''")}'!`
        : match;
    }
  );
}

// ============================================================
// COPY UNIVER WORKSHEET INTO EXCEL
// ============================================================

function copySheet(
  worksheet,
  source,
  sourceWorkbook,
  sheetNames
) {
  worksheet.views = [
    {
      showGridLines:
        source.showGridlines !== 0,
    },
  ];

  // Default row height

  if (source.defaultRowHeight > 0) {
    worksheet.properties.defaultRowHeight =
      source.defaultRowHeight * 0.75;
  }

  // Default column width

  if (source.defaultColumnWidth > 0) {
    worksheet.properties.defaultColWidth =
      Math.max(
        1,
        (source.defaultColumnWidth - 5) / 7
      );
  }

  // Column configuration

  for (
    const [index, config]
    of Object.entries(
      source.columnData || {}
    )
  ) {
    const columnNumber =
      Number(index) + 1;

    if (
      !Number.isInteger(columnNumber) ||
      columnNumber < 1 ||
      columnNumber > MAX_COLUMN
    ) {
      continue;
    }

    const column =
      worksheet.getColumn(columnNumber);

    if (config?.w > 0) {
      column.width = Math.max(
        1,
        (config.w - 5) / 7
      );
    }

    if (config?.hd) {
      column.hidden = true;
    }
  }

  // Row configuration

  for (
    const [index, config]
    of Object.entries(
      source.rowData || {}
    )
  ) {
    const rowNumber =
      Number(index) + 1;

    if (
      !Number.isInteger(rowNumber) ||
      rowNumber < 1 ||
      rowNumber > MAX_ROW
    ) {
      continue;
    }

    const row =
      worksheet.getRow(rowNumber);

    if (config?.h > 0) {
      row.height = config.h * 0.75;
    }

    if (config?.hd) {
      row.hidden = true;
    }
  }

  const workbookStyles =
    sourceWorkbook.styles || {};

  // Copy spreadsheet cells

  for (
    const [rowIndex, columns]
    of Object.entries(
      source.cellData || {}
    )
  ) {
    const rowNumber =
      Number(rowIndex) + 1;

    if (
      !Number.isInteger(rowNumber) ||
      rowNumber < 1 ||
      rowNumber > MAX_ROW
    ) {
      continue;
    }

    for (
      const [columnIndex, data]
      of Object.entries(columns || {})
    ) {
      const columnNumber =
        Number(columnIndex) + 1;

      if (
        !Number.isInteger(columnNumber) ||
        columnNumber < 1 ||
        columnNumber > MAX_COLUMN ||
        !data
      ) {
        continue;
      }

      const target =
        worksheet.getCell(
          rowNumber,
          columnNumber
        );

      const value = cellValue(data);

      // Formulas

      if (
        typeof data.f === "string" &&
        data.f.length
      ) {
        target.value = {
          formula:
            renameFormulaReferences(
              data.f.replace(/^=/, ""),
              sheetNames
            ),

          ...(value != null
            ? { result: value }
            : {}),
        };

      } else {
        target.value = value;
      }

      // Styles

      const style = {
        ...resolveStyle(
          sourceWorkbook.defaultStyle,
          workbookStyles
        ),

        ...resolveStyle(
          source.defaultStyle,
          workbookStyles
        ),

        ...resolveStyle(
          source.columnData?.[columnIndex]?.s,
          workbookStyles
        ),

        ...resolveStyle(
          source.rowData?.[rowIndex]?.s,
          workbookStyles
        ),

        ...resolveStyle(
          data.s,
          workbookStyles
        ),
      };

      applyCellStyle(target, style);
    }
  }

  // Merged cells

  for (
    const range
    of source.mergeData || []
  ) {
    const {
      startRow,
      startColumn,
      endRow,
      endColumn,
    } = range || {};

    if (
      ![
        startRow,
        startColumn,
        endRow,
        endColumn,
      ].every(Number.isInteger)
    ) {
      continue;
    }

    if (
      startRow < 0 ||
      startColumn < 0 ||
      endRow < startRow ||
      endColumn < startColumn
    ) {
      continue;
    }

    if (
      endRow >= MAX_ROW ||
      endColumn >= MAX_COLUMN
    ) {
      continue;
    }

    worksheet.mergeCells(
      startRow + 1,
      startColumn + 1,
      endRow + 1,
      endColumn + 1
    );
  }
}

// ============================================================
// ADD INDEXER'S WORKBOOK TO COMBINED EXCEL
// ============================================================

function appendEmployeeWorkbook(
  targetWorkbook,
  statement,
  usedNames
) {
  const data =
    typeof statement.workbookData === "string"
      ? JSON.parse(statement.workbookData)
      : statement.workbookData;

  if (
    !data?.sheets ||
    !Array.isArray(data.sheetOrder) ||
    !data.sheetOrder.length
  ) {
    throw new Error(
      `Invalid workbook for ${statement.employeeName || "an Indexer"
      }.`
    );
  }

  const sheets =
    data.sheetOrder
      .map((id) => data.sheets[id])
      .filter(Boolean);

  if (!sheets.length) {
    throw new Error(
      `No worksheets for ${statement.employeeName || "an Indexer"
      }.`
    );
  }

  const names = new Map();

  const entries = sheets.map(
    (sheet, index) => {
      const title =
        sheets.length === 1
          ? statement.employeeName
          : `${statement.employeeName} - ${sheet.name ||
          `Sheet${index + 1}`
          }`;

      const exportName =
        uniqueWorksheetName(
          title,
          usedNames
        );

      names.set(
        String(
          sheet.name || `Sheet${index + 1}`
        ).toLowerCase(),
        exportName
      );

      return {
        sheet,
        exportName,
      };
    }
  );

  for (
    const { sheet, exportName }
    of entries
  ) {
    const worksheet =
      targetWorkbook.addWorksheet(
        exportName
      );

    copySheet(
      worksheet,
      sheet,
      data,
      names
    );
  }
}


function addAllStatementsSheet(
  book,
  snapshots,
  productionDate
) {
  const combined = book.addWorksheet("All Statements");

  combined.views = [
    {
      state: "frozen",
      ySplit: 2,
      showGridLines: true,
    },
  ];

  combined.getColumn(1).width = 32;

  for (let col = 2; col <= 8; col++) {
    combined.getColumn(col).width = 18;
  }

  // Main heading

  combined.mergeCells("A1:H1");

  const title = combined.getCell("A1");

  title.value =
    "PRODTRACK - ALL INDEXER DAILY WORK STATEMENTS";

  title.font = {
    bold: true,
    size: 15,
    color: { argb: "FFFFFFFF" },
  };

  title.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF17365D" },
  };

  combined.getRow(1).height = 27;

  combined.getCell("A2").value =
    `Production Date: ${productionDate}`;

  combined.getCell("D2").value =
    `Submitted Indexers: ${snapshots.length}`;

  let nextRow = 4;
  let included = 0;

  // Add EVERY Indexer's statement

  for (const statement of snapshots) {
    const data =
      typeof statement.workbookData === "string"
        ? JSON.parse(statement.workbookData)
        : statement.workbookData;

    const sheets = (data?.sheetOrder || [])
      .map((id) => data?.sheets?.[id])
      .filter(Boolean);

    if (!sheets.length) {
      throw new Error(
        `Missing workbook for ${statement.employeeName}`
      );
    }

    const name = String(
      statement.employeeName || "Indexer"
    );

    if (nextRow + 4 >= MAX_ROW) {
      throw new Error(
        "Too many rows for a single Excel worksheet."
      );
    }

    // Employee heading

    combined.mergeCells(nextRow, 1, nextRow, 8);

    const heading = combined.getCell(nextRow, 1);

    heading.value = `EMPLOYEE: ${name}`;

    heading.font = {
      bold: true,
      size: 13,
      color: { argb: "FFFFFFFF" },
    };

    heading.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF167344" },
    };

    combined.getRow(nextRow).height = 23;

    nextRow++;

    combined.getCell(nextRow, 1).value =
      `Shift: ${statement.shiftName || "Not Assigned"} | Date: ${productionDate}`;

    nextRow += 2;

    // Include every worksheet created by this Indexer

    for (const source of sheets) {
      combined.getCell(nextRow, 1).value =
        `Worksheet: ${source.name || "Sheet"}`;

      combined.getCell(nextRow, 1).font = {
        bold: true,
        color: { argb: "FF17365D" },
      };

      nextRow++;

      const offset = nextRow;
      let maxRowIndex = -1;

      const styles = data.styles || {};

      // Copy all cells

      for (const [rowKey, columns] of Object.entries(
        source.cellData || {}
      )) {
        const rowIndex = Number(rowKey);

        if (
          !Number.isInteger(rowIndex) ||
          rowIndex < 0
        ) {
          continue;
        }

        for (const [columnKey, cellData] of Object.entries(
          columns || {}
        )) {
          const columnIndex = Number(columnKey);

          if (
            !Number.isInteger(columnIndex) ||
            columnIndex < 0 ||
            columnIndex >= MAX_COLUMN ||
            !cellData
          ) {
            continue;
          }

          if (offset + rowIndex > MAX_ROW) {
            throw new Error(
              `Worksheet for ${name} exceeds Excel row limits.`
            );
          }

          const target = combined.getCell(
            offset + rowIndex,
            columnIndex + 1
          );

          const value = cellValue(cellData);

          // Display cached formula result where available.
          // Otherwise display formula text.

          target.value =
            value == null && cellData.f
              ? String(cellData.f).startsWith("=")
                ? String(cellData.f)
                : `=${cellData.f}`
              : value;

          const style = {
            ...resolveStyle(
              data.defaultStyle,
              styles
            ),

            ...resolveStyle(
              source.defaultStyle,
              styles
            ),

            ...resolveStyle(
              source.columnData?.[columnKey]?.s,
              styles
            ),

            ...resolveStyle(
              source.rowData?.[rowKey]?.s,
              styles
            ),

            ...resolveStyle(
              cellData.s,
              styles
            ),
          };

          applyCellStyle(target, style);

          maxRowIndex = Math.max(
            maxRowIndex,
            rowIndex
          );
        }
      }

      // Copy merged cells

      for (const range of source.mergeData || []) {
        const {
          startRow,
          startColumn,
          endRow,
          endColumn,
        } = range || {};

        if (
          ![
            startRow,
            startColumn,
            endRow,
            endColumn,
          ].every(Number.isInteger) ||
          startRow < 0 ||
          startColumn < 0 ||
          endRow < startRow ||
          endColumn < startColumn ||
          endColumn >= MAX_COLUMN
        ) {
          continue;
        }

        if (offset + endRow > MAX_ROW) {
          throw new Error(
            `Merged cells for ${name} exceed Excel row limits.`
          );
        }

        combined.mergeCells(
          offset + startRow,
          startColumn + 1,
          offset + endRow,
          endColumn + 1
        );

        maxRowIndex = Math.max(
          maxRowIndex,
          endRow
        );
      }

      if (maxRowIndex < 0) {
        combined.getCell(offset, 1).value =
          "(Blank worksheet)";

        maxRowIndex = 0;
      }

      // Leave space before the next worksheet

      nextRow = offset + maxRowIndex + 3;
    }

    // Leave space before the next employee

    nextRow++;

    included++;
  }

  return included;
}


// ============================================================
// DOWNLOAD ALL SUBMITTED INDEXER STATEMENTS
// ============================================================

export async function downloadAllDailyWorkStatements({
  statements,
  productionDate,
  onProgress,
}) {
  // Only submitted statements

  const submitted =
    (statements || []).filter(
      (row) =>
        row.status === "submitted" &&
        row.statementId
    );

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      productionDate
    )
  ) {
    throw new Error(
      "Choose a valid production date."
    );
  }

  if (!submitted.length) {
    throw new Error(
      "No submitted statements found for this date."
    );
  }

  const snapshots =
    new Array(submitted.length);

  let cursor = 0;
  let completed = 0;

  onProgress?.({
    completed,
    total: submitted.length,
  });

  // Fetch up to 3 workbooks simultaneously.

  async function fetchNext() {
    while (
      cursor < submitted.length
    ) {
      const index = cursor++;

      const row = submitted[index];

      const response =
        await apiRequest(
          `/daily-work-statements/reports/${encodeURIComponent(
            row.statementId
          )}`
        );

      if (
        !response.success ||
        !response.statement?.workbookData
      ) {
        throw new Error(
          `Unable to download the statement for ${row.employeeName}.`
        );
      }


      if (
        String(response.statement.statementId) !==
        String(row.statementId)
      ) {
        throw new Error(
          `Incorrect statement returned for ${row.employeeName}.`
        );
      }

      snapshots[index] = {
        ...response.statement,

        employeeName:
          response.statement.employeeName ||
          row.employeeName,
      };


      completed += 1;

      onProgress?.({
        completed,
        total: submitted.length,
      });
    }
  }

  await Promise.all(
    Array.from(
      {
        length: Math.min(
          3,
          submitted.length
        ),
      },
      () => fetchNext()
    )
  );

  // Create combined Excel workbook

  const book =
    new ExcelJS.Workbook();

  book.creator = "ProdTrack";

  book.created = new Date();

  book.calcProperties.fullCalcOnLoad =
    true;


  // First worksheet contains ALL Indexers together.

  const combinedEmployees = addAllStatementsSheet(
    book,
    snapshots,
    productionDate
  );

  // Prevent incomplete downloads.

  if (combinedEmployees !== submitted.length) {
    throw new Error(
      "Not all Indexer statements were included."
    );
  }

  // Also keep separate worksheets for each Indexer.

  const usedNames = new Set(["all statements"]);

  for (const statement of snapshots) {
    appendEmployeeWorkbook(
      book,
      statement,
      usedNames
    );
  }


  // Generate XLSX file

  const contents =
    await book.xlsx.writeBuffer();

  const blob =
    new Blob(
      [contents],
      {
        type: XLSX_MIME,
      }
    );

  const url =
    URL.createObjectURL(blob);

  try {
    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      `ProdTrack_All_Indexer_Statements_${productionDate}.xlsx`;

    document.body.appendChild(link);

    link.click();

    link.remove();

  } finally {
    setTimeout(
      () => URL.revokeObjectURL(url),
      60000
    );
  }

  return {
    employees: submitted.length,
    worksheets: book.worksheets.length,
  };
}
