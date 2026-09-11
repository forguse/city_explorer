# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

City Explorer is a location-based task exploration app with social features. It's a full-stack application with:
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + MongoDB + Socket.io
- **Key Features**: Task creation/execution, social community, clubs, encounters (serendipity events), rewards, messaging

## Development Commands

### Frontend
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (opens at http://localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build
```

### Backend
```bash
cd backend
npm install          # Install dependencies
npm run dev          # Start dev server with nodemon (port 5000)
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled backend
```

### Environment Setup
- Frontend: Set `GEMINI_API_KEY` in `.env.local` for AI features
- Backend: Configure `MONGODB_URI` and `PORT` in backend `.env` file
- API URL: Frontend uses `VITE_API_URL` env var, defaults to `http://localhost:5000`

## Architecture Overview

### Frontend Structure
