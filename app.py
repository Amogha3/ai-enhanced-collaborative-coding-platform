from flask import Flask, render_template, request, jsonify
import ast, subprocess, sys, tempfile, os, textwrap
app = Flask(__name__)
rooms = {}

@app.get('/')
def home(): return render_template('index.html')

@app.post('/api/room')
def room():
    data=request.get_json(force=True); rid=(data.get('room') or 'demo').strip()[:40]
    rooms.setdefault(rid, {'code':'# Start coding together\nprint("Hello, team!")','language':'python','version':0})
    return jsonify(room=rid, **rooms[rid])

@app.put('/api/room/<rid>')
def update_room(rid):
    data=request.get_json(force=True); state=rooms.setdefault(rid,{})
    state.update(code=data.get('code',''), language=data.get('language','python'), version=state.get('version',0)+1)
    return jsonify(state)

@app.post('/api/run')
def run_code():
    data=request.get_json(force=True); code=data.get('code',''); lang=data.get('language','python')
    if lang != 'python': return jsonify(output='Execution preview currently supports Python.\nSwitch language to Python to run.', status='info')
    try:
        ast.parse(code)
        with tempfile.TemporaryDirectory() as d:
            p=subprocess.run([sys.executable,'-I','-'],input=code,text=True,capture_output=True,timeout=3,cwd=d)
        return jsonify(output=(p.stdout+p.stderr)[-4000:] or 'Program finished with no output.',status='success' if p.returncode==0 else 'error')
    except SyntaxError as e: return jsonify(output=f'SyntaxError: {e}',status='error')
    except Exception as e: return jsonify(output=f'Execution stopped: {e}',status='error')

@app.post('/api/ai-assist')
def ai_assist():
    data=request.get_json(force=True); code=data.get('code',''); action=data.get('action','explain')
    try: ast.parse(code)
    except SyntaxError as e: return jsonify(answer=f'I found a syntax issue near line {e.lineno}: {e.msg}. Check brackets, indentation, and colons.')
    if action=='review': answer='Code review: structure is readable. Add input validation, small reusable functions, and tests for edge cases before merging.'
    elif action=='improve': answer='Suggested improvement: separate the main logic into functions and add clear type hints and error handling.'
    else: answer='Explanation: this code is syntactically valid. In a team room, use comments for decisions and keep each change focused so collaborators can review it.'
    return jsonify(answer=answer)

if __name__=='__main__': app.run(debug=True, port=5000)
