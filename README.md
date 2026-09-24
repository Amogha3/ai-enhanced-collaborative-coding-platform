# CodeTogether AI - AI-Enhanced Collaborative Coding Platform

A portfolio project for collaborative browser-based coding. Users join a room, edit code, autosave shared state, run Python safely with a timeout, and request explain/review/improve assistance.

## Code Time Machine
The hosted demo now supports named, room-specific checkpoints. In the workspace, save a checkpoint, edit the code, then select **Compare** to inspect added and removed lines. **Restore** brings back the chosen code and language, and **Download** exports that checkpoint with the appropriate source-file extension. Up to 30 checkpoints are kept per room in this browser.

## Demo scope
The hosted static site provides a front-end login demonstration and browser-local room data. BroadcastChannel can synchronize tabs in the same browser profile. Checkpoints remain in local browser storage; they do not sync between devices. The Run panel and explanation/review/improvement responses in the static site are demonstrations rather than a general-purpose code runner or a connected AI model. Production authentication, cross-device collaboration, secure code execution, and a real AI service require backend infrastructure.

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
