<h1 align="center">CodeLens</h1>

<p align="center">
  <strong>Write code → Run it → Watch it execute line by line → Let AI catch what you missed</strong>
</p>

## What is CodeLens?

CodeLens is a full-stack web application that combines a **multi-language code execution environment**, a **line-by-line code visualizer**, and an **AI-powered code reviewer** — all in one editorial, premium interface.

Write code in any of **17+ supported languages**, hit **Run** to execute it instantly, or hit **Visualize** to step through every line and watch variables change in real time. If your code has errors, the AI automatically explains what went wrong and how to fix it.

---

## Features

### ⊞ Code Studio
- **Multi-language support** — JavaScript, Python, Java, C++, Go, Rust, Ruby, C#, TypeScript, PHP, Kotlin, Swift, Bash, R, Lua, Perl, and more
- **Instant execution** — Code runs via the [Piston API](https://github.com/engineer-man/piston) (free, no auth required)
- **Line-by-line visualization** — Step through code execution with a scrubber, see variables update at each line, track output as it builds
- **Variable tracking** — Full local variable inspection for JavaScript and Python; sequential line highlighting for all other languages
- **Auto AI error explanation** — When code fails, Claude AI automatically streams an explanation of the error and how to fix it

### ◈ AI Code Review
- **Paste any code** and get a structured review with severity-rated insights
- **Live SSE streaming** — Watch the AI response type out in real time
- **Actionable insights** — Each issue includes a title, explanation, line reference, and suggested fix
- **Code score** — Overall quality score out of 100
- **Improved code** — AI generates a corrected version of your code

### ◎ Review History
- Browse all past analyses
- Score tracking and issue counts
- Aggregate statistics across all reviews

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | React 19 + Vite 8 | SPA with fast HMR |
| **Styling** | Vanilla CSS (custom design system) | Floema-inspired warm dark editorial palette |
| **Backend** | Raw Node.js `http.createServer()` | No Express — demonstrates low-level HTTP handling |
| **Code Execution** | [Piston API](https://github.com/engineer-man/piston) | Free multi-language code runner, no API key needed |
| **AI Review** | Claude (Anthropic API) | Streaming code analysis via SSE |
| **Routing** | React Router v7 | Client-side SPA navigation |

### Key Concepts Demonstrated

| Concept | Where |
|---|---|
| **Buffers** | `req.on('data', chunk => chunks.push(chunk))` → `Buffer.concat()` in server routes |
| **Streams** | Claude response streamed chunk-by-chunk via Server-Sent Events |
| **EventEmitter** | Server emits `review:started`, `chunk:received`, `review:complete` lifecycle events |
| **Async/Await** | `fetch()` + `reader.read()` loop for consuming SSE in the browser |
| **Callbacks** | `requestAnimationFrame` drives the visualizer animation loop |
| **DOM Manipulation** | Line highlights, variable panels, and bar animations update live |
| **JSON** | Code sent as JSON body; AI returns structured `{ insights, score }` |

---

## Project Structure

```
codelens/
├── client/                    # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── editor/        # CodeEditor (syntax highlight, line numbers, annotations)
│   │   │   ├── layout/        # Nav, Footer
│   │   │   └── visualizer/    # SortVisualizer, algorithm implementations
│   │   ├── pages/
│   │   │   ├── Landing.jsx    # Editorial homepage with scroll animations
│   │   │   ├── CodeStudio.jsx # Multi-language editor + Run + Visualize
│   │   │   ├── AIReview.jsx   # AI code review with SSE streaming
│   │   │   └── History.jsx    # Past review browser
│   │   ├── index.css          # Global design system (Floema palette)
│   │   └── App.jsx            # Router setup
│   ├── index.html
│   └── vite.config.js
│
├── server/                    # Raw Node.js backend (no Express)
│   ├── index.js               # HTTP server, manual routing
│   ├── routes/
│   │   ├── execute.js         # POST /api/execute  — run code via Piston
│   │   ├── visualize.js       # POST /api/visualize — instrumented line trace
│   │   ├── review.js          # POST /api/review   — AI review via Claude SSE
│   │   └── history.js         # GET  /api/history  — past reviews
│   ├── events/
│   │   └── emitter.js         # EventEmitter for review lifecycle
│   └── .env                   # ANTHROPIC_API_KEY (git-ignored)
│
└── .gitignore
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- An [Anthropic API key](https://console.anthropic.com/) (for the AI Review feature)

### Installation

```bash
# Clone the repo
git clone https://github.com/Bhuvanesh0733/CodeLens.git
cd CodeLens

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Configuration

Create a `.env` file in the `server/` directory:

```env
ANTHROPIC_API_KEY=your_api_key_here
PORT=3001
```


### Running Locally

Open **two terminals**:

```bash
# Terminal 1 — Backend (port 3001)
cd server
node index.js

# Terminal 2 — Frontend (port 5173)
cd client
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/execute` | Execute code in any supported language |
| `POST` | `/api/visualize` | Instrument code and return line-by-line trace steps |
| `POST` | `/api/review` | Stream AI code review via SSE |
| `GET` | `/api/history` | Retrieve past review results |
| `GET` | `/api/stats` | Server statistics |
| `GET` | `/api/events` | SSE endpoint for live server stats |

---

## Deployment (Render)

### Backend — Web Service

| Setting | Value |
|---|---|
| Root Directory | `server` |
| Build Command | `npm install` |
| Start Command | `node index.js` |
| Environment Variable | `ANTHROPIC_API_KEY` = your key |

### Frontend — Static Site

| Setting | Value |
|---|---|
| Root Directory | `client` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `client/dist` |
| Environment Variable | `VITE_API_URL` = your backend URL |
| Rewrite Rule | `/*` → `/index.html` (Rewrite) |

---

## Design

CodeLens uses a **Floema-inspired** design system — warm, editorial, premium dark:

- **Background**: `#0E0C09` deep warm charcoal
- **Text**: `#F2E8D9` warm cream
- **Accent**: `#C4956A` warm amber
- **Typography**: Space Grotesk (display) · Inter (body) · JetBrains Mono (code)
- **Style**: Asymmetric layouts, generous whitespace, subtle micro-animations

---

## Supported Languages

| Language | Language | Language |
|---|---|---|
| JavaScript | TypeScript | Python |
| Java | C | C++ |
| C# | Go | Rust |
| Ruby | PHP | Swift |
| Kotlin | Bash | R |
| Lua | Perl | — |

---

## License

This project is for educational purposes.

---

<p align="center">
  <sub>Built with ◈ by <a href="https://github.com/Bhuvanesh0733">Bhuvanesh</a></sub>
</p>
