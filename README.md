# CodeTogether LAB — VTU major project prototype

A working Flask + SQLite collaborative coding workspace. Users register, create rooms with a passcode, request access, receive owner approval, edit code together, and save/compare/restore checkpoints. This version is designed for local classroom demonstration and interviews.

## Run in VS Code (Windows)

1. Open this folder with **File → Open Folder** in VS Code.
2. Open **Terminal → New Terminal**.
3. Run:

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

If PowerShell blocks activation, use `.venv\Scripts\python.exe -m pip install -r requirements.txt` and `.venv\Scripts\python.exe app.py` instead.
Open **http://127.0.0.1:5000**. Linux/macOS: `python3 -m venv .venv`, `source .venv/bin/activate`, `pip install -r requirements.txt`, `python app.py`.

## Demonstrate

Register two accounts using two separate browser profiles. Account A creates a room with an 8+ character passcode. Account B requests access using the ID and passcode. A approves B in **Access requests**. B opens the room and edits code; A sees saved updates within 2 seconds. Save a checkpoint, change the code, compare, then restore.

## Architecture and boundaries

- Passwords and room passcodes are hashed; session cookies identify signed-in users. SQLite stores rooms, approvals, code versions, and checkpoints. A second browser profile or another device can connect to the *same running server*, provided the server is configured for LAN access.
- This uses 2-second polling and explicit Save, with optimistic version checks to prevent silent overwrites. It does **not** implement simultaneous character-level merging or presence indicators. If edits conflict, copy your unsaved work, reload, and reconcile it.
- The explanation feature provides a translated generic overview for 16 programming languages and five spoken languages. It is **rule based** and cannot explain the actual semantics of arbitrary code. There is no connected AI service.
- Code execution was intentionally removed: running submitted code inside the web server is unsafe without a separate sandbox. For a presentation, run source in VS Code with a trusted local interpreter.
- This classroom prototype lacks CSRF protection, login rate limits, email verification, password reset, and production deployment hardening. Do not host it publicly as-is. Set a persistent random `SECRET_KEY` in the environment for multiple processes or persistent sessions. SQLite is created locally and ignored by Git.

## Tech stack

Python 3.10+, Flask, Werkzeug password hashing, SQLite, vanilla JavaScript, CSS. No paid API key required.
