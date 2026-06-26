@echo off
echo ============================================
echo   InvoiceAI - Local Invoice Scanner
echo ============================================
echo.

:: ── Pull Ollama models if not present ────────────────────────────────────────
echo [1/4] Checking Ollama models...
echo Pulling qwen2.5:3b (text extraction model)...
ollama pull qwen2.5:3b
echo Pulling moondream (vision model for image invoices)...
ollama pull moondream
echo.

:: ── Start Ollama in background ────────────────────────────────────────────────
echo [2/4] Starting Ollama server...
start "Ollama Server" /B ollama serve
timeout /t 3 /nobreak >nul
echo.

:: ── Start Python backend ──────────────────────────────────────────────────────
echo [3/4] Starting FastAPI backend on http://localhost:8000 ...
start "InvoiceAI Backend" cmd /c "cd /d %~dp0backend && venv\Scripts\python.exe run.py"
timeout /t 4 /nobreak >nul
echo.

:: ── Start React frontend ──────────────────────────────────────────────────────
echo [4/4] Starting React frontend on http://localhost:5173 ...
start "InvoiceAI Frontend" cmd /c "cd /d %~dp0frontend && npm run dev"
timeout /t 4 /nobreak >nul

echo.
echo ============================================
echo  All services started!
echo.
echo   Frontend UI:  http://localhost:5173
echo   Backend API:  http://localhost:8000
echo   API Docs:     http://localhost:8000/docs
echo ============================================
echo.
echo Opening browser...
timeout /t 2 /nobreak >nul
start http://localhost:5173

echo.
echo Press any key to exit this window (services keep running in background).
pause >nul
