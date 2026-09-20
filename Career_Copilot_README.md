# Career Copilot (ResumeIQ) - AI ATS Optimizer

An AI-powered resume intelligence platform that provides transparent ATS scoring, job description alignment, and semantic AI matching. This application is designed to help job seekers align their resumes with industry standards (like IIT/NIT Tier 1 Benchmarks) and pass automated ATS filters.

## System Architecture

The system consists of a FastAPI backend handling document parsing, heuristic scoring, and LLM-based optimization (using Gemini/Groq), and a Next.js (App Router) frontend providing a sleek, responsive interface. 

### Key Features
1. **Document Parsing**: Extracts text from PDF and DOCX files.
2. **ATS Scoring**: Rule-based scoring engine for structure, impact, and keywords.
3. **Job Match & Semantic Engine**: Fuzzy string matching and `Sentence-BERT` (`all-MiniLM-L6-v2`) semantic comparison between resume and job descriptions.
4. **AI Optimization**: Strictly controlled prompt engineering and LLM integrations (Google Gemini or Groq) to provide zero-hallucination improvements to bullet points.
5. **RenderCV Integration**: Automatically generates PDF resumes from optimized data.

---

## 1. Setup the Backend

The backend is built with Python 3.10+, FastAPI, PyMuPDF, Sentence-BERT, and RapidFuzz.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configuration (Required):
   Create a `.env` file in the `backend/` directory with the following variables:
   ```env
   LLM_PROVIDER=gemini  # or groq
   GEMINI_API_KEY=your-gemini-api-key-here
   GROQ_API_KEY=your-groq-api-key-here
   GEMINI_MODEL=gemini-3.8-flash
   GROQ_MODEL=openai/gpt-oss-120b
   DATABASE_URL=postgresql://resumeiq:password@localhost:5432/resumeiq_db
   SECRET_KEY=your-super-secret-key
   ```
5. Start the FastAPI server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *Note: On the first run, the Sentence-BERT NLP model (`all-MiniLM-L6-v2`) will be downloaded automatically.*

The backend API will be available at [http://localhost:8000](http://localhost:8000). Interactive API docs at [http://localhost:8000/docs](http://localhost:8000/docs).

---

## 2. Setup the Frontend

The frontend is built with Node.js 18+, Next.js (App Router), React, and Tailwind CSS.

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Environment Configuration:
   You may create a `.env.local` to point to the backend if running on a different host.
   ```env
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will be available at [http://localhost:3000](http://localhost:3000).

---

## 3. Setup the Database (Optional)

If you wish to use the Postgres + pgvector database for storing users and resume versions:

1. In the root directory, run:
   ```bash
   docker-compose up -d
   ```
   This spins up PostgreSQL (port 5432) and Redis (port 6379).

---

## Data Flow (Real-Time API vs Mock Data)
This application **does not use mock data**. It relies on live, real-time data flowing from the backend. 
- **Upload**: When a user uploads a resume, the frontend `api.ts` sends a multipart form data request to `POST /v1/documents/parse`.
- **State Management**: The real JSON response from the server is stored globally in `frontend/src/lib/resumeStore.tsx`.
- **Analysis**: The `dashboard` fetches the parsed resume from the state context and calls `POST /ats/analyze` for live ATS scoring and diagnostics. 
- **Optimization**: The `optimization` page makes live LLM calls (`POST /v1/optimization/suggest-all`) to generate suggestions instantly based on the actual parsed text.
