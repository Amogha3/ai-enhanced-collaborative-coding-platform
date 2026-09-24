# CodeTogether AI - AI-Enhanced Collaborative Coding Platform

A portfolio project for collaborative browser-based coding. Users join a room, edit code, autosave shared state, run Python safely with a timeout, and request explain/review/improve assistance.

## Run locally
```bash
python -m venv .venv
# Windows: .venv\\Scripts\\activate | macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python app.py
```
Open http://127.0.0.1:5000.

## Stack
Python, Flask, JavaScript, HTML, CSS, SQLite-ready room API, AST validation, subprocess timeout.
