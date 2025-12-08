
export function exportToHtml(pageTree){
  // Basic HTML export
  return `
  <html>
    <body>
      <h1>${pageTree?.props?.text || "Page"}</h1>
    </body>
  </html>
  `;
}
