// Inline SVG matching the app's Logo component (viewBox 0 0 100 40)
const LOGO_HEADER = `
<div style="display:flex;align-items:center;justify-content:flex-end;padding-bottom:14px;margin-bottom:28px;border-bottom:2px solid #e8eaed;">
  <svg width="140" height="56" viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg">
    <text x="0" y="31" font-family="Pacifico, cursive" font-size="40" fill="#326080">δ</text>
    <text x="22" y="31" font-family="Arial, sans-serif" font-size="30" fill="#326080">elta</text>
    <text x="70" y="32" font-family="Arial, sans-serif" font-weight="600" font-size="30" fill="#CC5500">X</text>
  </svg>
</div>`;

const PRINT_STYLES = `
  @page { margin: 1in; }
  *, *::before, *::after { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    font-family: Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #202124;
  }
  p { margin: 0 0 0.5em; }
  h1 { font-size: 2em;   font-weight: 700; margin: 0.67em 0; }
  h2 { font-size: 1.5em;  font-weight: 700; margin: 0.83em 0; }
  h3 { font-size: 1.17em; font-weight: 700; margin: 1em 0; }
  h4 { font-size: 1em;   font-weight: 700; margin: 1.33em 0; }
  h5 { font-size: 0.83em; font-weight: 700; margin: 1.67em 0; }
  h6 { font-size: 0.67em; font-weight: 700; margin: 2.33em 0; }
  ul, ol { padding-left: 1.5em; margin: 0.5em 0; }
  li { margin: 0.2em 0; }
  ul:not([data-type="taskList"]) { list-style-type: disc; }
  ul:not([data-type="taskList"]) ul:not([data-type="taskList"]) { list-style-type: circle; }
  ul:not([data-type="taskList"]) ul:not([data-type="taskList"]) ul:not([data-type="taskList"]) { list-style-type: square; }
  ol { list-style-type: decimal; }
  ol ol { list-style-type: lower-alpha; }
  ol ol ol { list-style-type: lower-roman; }
  ul[data-type="taskList"] { list-style: none; padding-left: 0; }
  ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 6px; }
  ul[data-type="taskList"] li > label { flex-shrink: 0; margin-top: 2px; }
  ul[data-type="taskList"] li > div { flex: 1; }
  blockquote {
    margin: 0.5em 0;
    padding: 0.5em 0 0.5em 1em;
    border-left: 3px solid #4285f4;
    color: #5f6368;
    font-style: italic;
  }
  pre {
    background: #f1f3f4;
    border-radius: 4px;
    padding: 0.75em 1em;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
    overflow-x: auto;
    margin: 0.5em 0;
  }
  code {
    background: #f1f3f4;
    border-radius: 3px;
    padding: 0.1em 0.3em;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
  }
  pre code { background: none; padding: 0; }
  hr { border: none; border-top: 2px solid #e0e0e0; margin: 1em 0; }
  a { color: #1a73e8; text-decoration: underline; }
  img { max-width: 100%; height: auto; }
  table { border-collapse: collapse; width: 100%; margin: 0.5em 0; table-layout: fixed; }
  th, td { border: 1px solid #d0d0d0; padding: 6px 10px; vertical-align: top; min-width: 60px; }
  th { background: #f1f3f4; font-weight: 700; text-align: left; }
  mark { border-radius: 2px; padding: 0 2px; }
  sup { vertical-align: super; font-size: 0.75em; }
  sub { vertical-align: sub; font-size: 0.75em; }
`;

/**
 * Replaces variable spans (<span data-variable-key="key">) with their plain-text values.
 * Spans with no matching value are removed entirely so unfilled placeholders don't appear.
 */
export function resolveVariablesInHtml(html: string, variables: Record<string, string>): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const spans = doc.querySelectorAll<HTMLElement>("[data-variable-key]");
  spans.forEach((span) => {
    const key = span.getAttribute("data-variable-key") ?? "";
    const value = Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : undefined;
    if (value !== undefined && value !== "") {
      span.parentNode?.replaceChild(doc.createTextNode(value), span);
    } else {
      span.parentNode?.removeChild(span);
    }
  });
  return doc.body.innerHTML;
}

export function printAsPdf(name: string, contentHtml: string) {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;width:1px;height:1px;border:none;left:-9999px;top:-9999px;visibility:hidden;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Pacifico&display=swap" rel="stylesheet" />
  <style>${PRINT_STYLES}</style>
</head>
<body>${LOGO_HEADER}${contentHtml}</body>
</html>`);
  doc.close();

  // setTimeout lets the browser finish rendering before print dialog opens
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
    }, 1000);
  }, 300);
}
