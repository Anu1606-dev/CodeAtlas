# CodeAtlas

> An AI-powered codebase explorer for understanding, searching, and navigating GitHub repositories.

CodeAtlas is a full-stack web application designed to make large codebases easier to explore and understand.

The project is being built incrementally, starting with the core repository exploration experience and evolving toward AI-powered code search, explanations, and RAG-based conversations.

## 🚧 Project Status

**Early development**

The initial monorepo, frontend, backend API, shared package, and development setup are in place.

More features and UI improvements are actively being developed.

## ✨ Planned Features

* 🔗 Connect GitHub repositories
* 📂 Explore repository file structures
* 📄 View source code
* 🔎 Search across codebases
* 🧠 Semantic code search using embeddings
* 🤖 AI-powered code explanations
* 💬 Ask questions about a codebase
* 📚 RAG-powered answers with code references
* 🌳 Code-aware code chunking
* 📊 Repository indexing and processing status
* 🔐 GitHub authentication
* ⚡ Background repository indexing

> Features will be added progressively as development continues.

## 🏗️ Tech Stack

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* daisyUI

### Backend

* Node.js
* Express
* TypeScript

### Project Structure

* pnpm workspaces
* Monorepo architecture
* Shared TypeScript package

### Planned / Exploring

* MongoDB
* GitHub API
* Gemini API
* Embeddings
* RAG
* tree-sitter
* Redis / BullMQ

## 📁 Project Structure

```text
CodeAtlas/
├── apps/
│   ├── api/          # Backend API
│   └── web/          # React frontend
│
├── packages/
│   └── shared/       # Shared TypeScript types
│
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## 🚀 Getting Started

### Prerequisites

Make sure you have installed:

* Node.js
* pnpm

### Installation

Clone the repository and install dependencies:

```bash
git clone <your-repository-url>
cd CodeAtlas
pnpm install
```

Build the shared package:

```bash
pnpm build:shared
```

### Run the API

```bash
pnpm dev:api
```

The API runs at:

```text
http://localhost:4000
```

### Run the Web App

In a separate terminal:

```bash
pnpm dev:web
```

The frontend runs at:

```text
http://localhost:5173
```

## 🧪 Current Demo

The current development version includes a basic frontend-to-backend health check.

The frontend communicates with the Express API through the Vite development proxy and displays the API status and timestamp.

## 🛠️ Development

Build the frontend:

```bash
pnpm --filter @codeatlas/web build
```

Build the shared package:

```bash
pnpm build:shared
```

Run the API in development mode:

```bash
pnpm dev:api
```

Run the web application in development mode:

```bash
pnpm dev:web
```

## 🗺️ Roadmap

### Phase 1 — Foundation

* [x] Monorepo setup
* [x] React + Vite frontend
* [x] Express API
* [x] Shared TypeScript package
* [x] Tailwind CSS + daisyUI
* [x] Frontend/API connection
* [ ] Initial dashboard UI

### Phase 2 — Repository Explorer

* [ ] GitHub repository connection
* [ ] Repository metadata
* [ ] File tree
* [ ] Source code viewer
* [ ] Code search

### Phase 3 — AI Code Intelligence

* [ ] Code embeddings
* [ ] Semantic search
* [ ] AI code explanations
* [ ] RAG pipeline
* [ ] Repository Q&A
* [ ] Source references

### Phase 4 — Production

* [ ] Authentication
* [ ] Background indexing
* [ ] Database integration
* [ ] Caching / queues
* [ ] Production deployment
* [ ] Monitoring and error handling

## 🎯 Goal

The goal of CodeAtlas is to create a practical developer tool that helps developers understand unfamiliar codebases faster by combining traditional code exploration with AI-powered search and explanations.

---

Built with ❤️ while learning and experimenting with modern full-stack development.
