/**
 * Utility to export tabular data to a CSV file and trigger browser download.
 * Includes UTF-8 BOM so Microsoft Excel and other spreadsheet applications
 * correctly display Malaysian text, special characters, and numbers.
 */
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
): void {
  const sanitizeCell = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return '""';
    const str = String(value);
    // Escape double quotes by doubling them
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const headerLine = headers.map(sanitizeCell).join(",");
  const rowLines = rows.map((row) => row.map(sanitizeCell).join(","));
  const csvContent = "\uFEFF" + [headerLine, ...rowLines].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  const safeFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  link.setAttribute("href", url);
  link.setAttribute("download", safeFilename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
