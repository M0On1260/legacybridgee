# Legacy Bridge — Modernization Analyzer
### Hackathon Demo · No API required

A fully client-side tool to analyze Natural & Adabas legacy code and generate modernization insights.

---

## 🚀 Running it

```bash
# Option 1: Just open the file
open index.html

# Option 2: Local server (recommended to avoid any CORS quirks)
npx serve .
# or
python3 -m http.server 3000
```

---

## 📁 Project structure

```
legacy-bridge/
├── index.html                  # Entry point
├── src/
│   ├── components/
│   │   └── app.js              # UI controller (tabs, events, render)
│   ├── utils/
│   │   ├── analyzer.js         # Core analysis engine (zero deps)
│   │   ├── graph.js            # Canvas dependency graph renderer
│   │   └── compare.js          # Before/After code generator
│   └── styles/
│       └── main.css            # All styles (dark theme)
└── README.md
```

---

## ✨ Features

| Feature | Description |
|---|---|
| **Code Input** | Paste Natural/Adabas code or upload a `.nat` file |
| **Sample loader** | 3 built-in samples: CRUD, Batch, Report |
| **Metrics** | Complexity, Coupling, Effort (pts + time), Lines |
| **Layer breakdown** | Business logic / Data access / Presentation / Control flow |
| **Issues** | Severity-tagged issues with specific migration advice |
| **Recommendations** | Ordered, code-specific modernization steps |
| **Phase indicator** | Shows which Legacy Bridge phase (Discover / Restructure / Migrate) |
| **Dependency graph** | Canvas-rendered graph of views, subroutines, and calls |
| **Before / After** | Natural code vs generated Java + Spring Boot equivalent |
| **Export** | Download full report as `.txt` |

---

## 🔧 How analysis works (all client-side)

The analyzer (`analyzer.js`) counts tokens via regex:
- **Complexity** = weighted sum of IFs, subroutines, READs, UPDATEs
- **Coupling** = VIEW references, UPDATE calls, CALLNAT/FETCH usage
- **Effort** = blended score of complexity + coupling + line count
- **Layers** = each layer's share estimated from matching keywords

No server, no API keys, no network requests.

---

## 🏗️ Extending it

To add real AI-powered analysis, swap the `analyzeCode()` call in `app.js` with a call to the Anthropic API:

```js
const result = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: `Analyze this Natural code:\n${code}` }]
  })
});
```

---

Built for hackathon demonstration of Legacy Bridge Technologies concepts.
