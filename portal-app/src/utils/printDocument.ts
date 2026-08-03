/**
 * Opens a popup window, writes a full HTML document into it, and prints it once the popup has
 * finished loading (so the browser's "Save as PDF" print destination produces a complete PDF
 * download without a new dependency). Lifted from the pattern already used in
 * src/pages/Timesheet.tsx's downloadPDF — same technique, generalized for reuse.
 *
 * Returns false if the popup was blocked, so callers can toast accordingly.
 */
export function openPrintWindow(title: string, bodyHtml: string): boolean {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #1a1a1a; }
          h1, h2, h3 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { background-color: #667eea; color: white; padding: 10px; text-align: left; border: 1px solid #ddd; }
          td { border: 1px solid #ddd; padding: 8px; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        ${bodyHtml}
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 100);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
  return true;
}
