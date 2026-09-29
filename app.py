import difflib
import os
import re
import secrets
import sqlite3
from functools import wraps
from datetime import datetime, timezone
from flask import Flask, g, jsonify, render_template, request, session
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY') or secrets.token_hex(32)
app.config.update(SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE='Lax', MAX_CONTENT_LENGTH=128000)
DB = os.environ.get('CODETOGETHER_DB', os.path.join(os.path.dirname(__file__), 'codetogether.sqlite3'))
LANGUAGES = {'python','javascript','typescript','java','c','cpp','csharp','go','rust','php','ruby','kotlin','swift','sql','html','css'}
TEXT = {
 'en': ('Code explanation', 'This {lang} code has {n} lines. Read the statements in order and inspect variables, functions, and output.'),
 'kn': ('ಕೋಡ್ ವಿವರಣೆ', 'ಈ {lang} ಕೋಡ್‌ನಲ್ಲಿ {n} ಸಾಲುಗಳಿವೆ. ಸಾಲುಗಳನ್ನು ಕ್ರಮವಾಗಿ ಓದಿ, ಚರಗಳು, ಕಾರ್ಯಗಳು ಮತ್ತು ಫಲಿತಾಂಶವನ್ನು ಪರಿಶೀಲಿಸಿ.'),
 'hi': ('कोड की व्याख्या', 'इस {lang} कोड में {n} पंक्तियाँ हैं। हर पंक्ति क्रम से पढ़ें; चर, फ़ंक्शन और परिणाम जाँचें।'),
 'ta': ('குறியீட்டு விளக்கம்', 'இந்த {lang} குறியீட்டில் {n} வரிகள் உள்ளன. ஒவ்வொரு வரியையும் வரிசையாகப் படித்து மாறிகள், செயல்கள், வெளியீட்டைப் பாருங்கள்.'),
 'te': ('కోడ్ వివరణ', 'ఈ {lang} కోడ్‌లో {n} పంక్తులు ఉన్నాయి. ప్రతి పంక్తిని క్రమంగా చదివి వేరియబుల్స్, ఫంక్షన్లు, ఫలితాన్ని చూడండి.')}

def db():
    if 'db' not in g:
        g.db = sqlite3.connect(DB, timeout=10)
        g.db.row_factory = sqlite3.Row
        g.db.execute('PRAGMA foreign_keys=ON')
    return g.db

@app.teardown_appcontext
def close(error):
    con = g.pop('db', None)
    if con: con.close()

def init_db():
    with app.app_context():
        db().executescript('''
        CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS rooms(id TEXT PRIMARY KEY,owner INTEGER NOT NULL REFERENCES users(id),passcode TEXT NOT NULL,language TEXT NOT NULL,code TEXT NOT NULL DEFAULT '',version INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE IF NOT EXISTS members(room TEXT NOT NULL REFERENCES rooms(id),user INTEGER NOT NULL REFERENCES users(id),status TEXT NOT NULL CHECK(status IN ('pending','approved')),PRIMARY KEY(room,user));
        CREATE TABLE IF NOT EXISTS snapshots(id INTEGER PRIMARY KEY,room TEXT NOT NULL REFERENCES rooms(id),label TEXT NOT NULL,code TEXT NOT NULL,language TEXT NOT NULL,created TEXT NOT NULL);
        ''')
        db().commit()

def error(message, code=400): return jsonify(error=message), code
def data(): return request.get_json(silent=True) or {}
def auth_required(fn):
    @wraps(fn)
    def wrapper(*a,**k):
        if not session.get('uid'): return error('Sign in first.',401)
        return fn(*a,**k)
    return wrapper

def room_access(rid, owner_only=False):
    room = db().execute('SELECT * FROM rooms WHERE id=?',(rid,)).fetchone()
    if not room: return None,error('Room not found.',404)
    if owner_only and room['owner'] != session['uid']: return None,error('Owner access required.',403)
    member = db().execute('SELECT status FROM members WHERE room=? AND user=?',(rid,session['uid'])).fetchone()
    if room['owner'] != session['uid'] and (not member or member['status'] != 'approved'):
        return None,error('Awaiting owner approval.',403)
    return room,None

@app.get('/')
def home(): return render_template('index.html')

@app.post('/api/auth/<action>')
def authenticate(action):
    d=data(); email=str(d.get('email','')).strip().lower(); password=str(d.get('password',''))
    if action not in ('register','login') or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+',email) or len(password)<8:
        return error('Use a valid email and password of at least 8 characters.')
    if action=='register':
        try:
            cur=db().execute('INSERT INTO users(email,password) VALUES (?,?)',(email,generate_password_hash(password))); db().commit(); uid=cur.lastrowid
        except sqlite3.IntegrityError: return error('Email already registered.',409)
    else:
        user=db().execute('SELECT * FROM users WHERE email=?',(email,)).fetchone()
        if not user or not check_password_hash(user['password'],password): return error('Invalid credentials.',401)
        uid=user['id']
    session.clear(); session['uid']=uid
    return jsonify(email=email)

@app.get('/api/me')
def me():
    row=db().execute('SELECT email FROM users WHERE id=?',(session.get('uid'),)).fetchone() if session.get('uid') else None
    return jsonify(email=row['email'] if row else None)

@app.post('/api/logout')
def logout(): session.clear(); return jsonify(ok=True)

@app.get('/api/rooms')
@auth_required
def list_rooms():
    uid=session['uid']
    rows=db().execute("SELECT r.id,r.language,CASE WHEN r.owner=? THEN 'owner' ELSE m.status END status FROM rooms r LEFT JOIN members m ON m.room=r.id AND m.user=? WHERE r.owner=? OR m.user=? ORDER BY r.id",(uid,uid,uid,uid)).fetchall()
    return jsonify(rooms=[dict(x) for x in rows])

@app.post('/api/rooms')
@auth_required
def create_room():
    d=data(); rid=str(d.get('id','')).strip().lower(); pw=str(d.get('passcode','')); lang=d.get('language')
    if not re.fullmatch('[a-z0-9-]{3,40}',rid) or len(pw)<8 or lang not in LANGUAGES:
        return error('Room ID: 3–40 letters, digits, hyphens; passcode: 8+ characters; select a language.')
    try:
        db().execute('INSERT INTO rooms(id,owner,passcode,language) VALUES (?,?,?,?)',(rid,session['uid'],generate_password_hash(pw),lang));db().commit()
    except sqlite3.IntegrityError: return error('Room ID already exists.',409)
    return jsonify(id=rid),201

@app.post('/api/rooms/<rid>/request')
@auth_required
def request_join(rid):
    room=db().execute('SELECT * FROM rooms WHERE id=?',(rid,)).fetchone()
    if not room: return error('Room not found.',404)
    if room['owner']==session['uid']: return jsonify(status='owner')
    if not check_password_hash(room['passcode'],str(data().get('passcode',''))): return error('Wrong passcode.',403)
    db().execute("INSERT OR IGNORE INTO members(room,user,status) VALUES (?,?,'pending')",(rid,session['uid'])); db().commit()
    status=db().execute('SELECT status FROM members WHERE room=? AND user=?',(rid,session['uid'])).fetchone()['status']
    return jsonify(status=status)

@app.get('/api/rooms/<rid>/requests')
@auth_required
def pending(rid):
    _,err=room_access(rid,True)
    if err:return err
    rows=db().execute("SELECT u.id,u.email FROM members m JOIN users u ON m.user=u.id WHERE m.room=? AND m.status='pending'",(rid,)).fetchall()
    return jsonify(requests=[dict(x) for x in rows])

@app.post('/api/rooms/<rid>/approve/<int:uid>')
@auth_required
def approve(rid,uid):
    _,err=room_access(rid,True)
    if err:return err
    cur=db().execute("UPDATE members SET status='approved' WHERE room=? AND user=? AND status='pending'",(rid,uid));db().commit()
    return jsonify(approved=bool(cur.rowcount))

@app.get('/api/rooms/<rid>')
@auth_required
def get_room(rid):
    room,err=room_access(rid)
    if err:return err
    return jsonify(id=rid,code=room['code'],language=room['language'],version=room['version'],owner=room['owner']==session['uid'])

@app.put('/api/rooms/<rid>')
@auth_required
def update_room(rid):
    _,err=room_access(rid)
    if err:return err
    d=data();code=d.get('code');lang=d.get('language');version=d.get('version')
    if not isinstance(code,str) or len(code)>50000 or lang not in LANGUAGES or type(version)!=int:return error('Invalid edit.')
    cur=db().execute('UPDATE rooms SET code=?,language=?,version=version+1 WHERE id=? AND version=?',(code,lang,rid,version));db().commit()
    if not cur.rowcount:return error('Room changed. Copy your edits and reload.',409)
    return jsonify(version=version+1)

@app.get('/api/rooms/<rid>/snapshots')
@auth_required
def snapshots(rid):
    _,err=room_access(rid)
    if err:return err
    rows=db().execute('SELECT id,label,language,created FROM snapshots WHERE room=? ORDER BY id DESC LIMIT 30',(rid,)).fetchall()
    return jsonify(snapshots=[dict(x) for x in rows])

@app.post('/api/rooms/<rid>/snapshots')
@auth_required
def save_snapshot(rid):
    room,err=room_access(rid)
    if err:return err
    label=str(data().get('label','')).strip()[:60]
    if not label:return error('Name the checkpoint.')
    db().execute('INSERT INTO snapshots(room,label,code,language,created) VALUES (?,?,?,?,?)',(rid,label,room['code'],room['language'],datetime.now(timezone.utc).isoformat(timespec='seconds')));db().commit()
    return jsonify(ok=True),201

@app.get('/api/rooms/<rid>/snapshots/<int:sid>')
@auth_required
def compare(rid,sid):
    room,err=room_access(rid)
    if err:return err
    snap=db().execute('SELECT * FROM snapshots WHERE room=? AND id=?',(rid,sid)).fetchone()
    if not snap:return error('Checkpoint not found.',404)
    diff='\n'.join(difflib.unified_diff(snap['code'].splitlines(),room['code'].splitlines(),fromfile='checkpoint',tofile='current',lineterm=''))
    return jsonify(code=snap['code'],language=snap['language'],diff=diff or 'No changes.')

@app.post('/api/rooms/<rid>/snapshots/<int:sid>/restore')
@auth_required
def restore(rid,sid):
    _,err=room_access(rid)
    if err:return err
    snap=db().execute('SELECT * FROM snapshots WHERE room=? AND id=?',(rid,sid)).fetchone()
    if not snap:return error('Checkpoint not found.',404)
    version=data().get('version')
    if type(version)!=int:return error('Version required.')
    cur=db().execute('UPDATE rooms SET code=?,language=?,version=version+1 WHERE id=? AND version=?',(snap['code'],snap['language'],rid,version));db().commit()
    if not cur.rowcount:return error('Room changed. Reload before restoring.',409)
    return jsonify(version=version+1)

@app.post('/api/explain')
@auth_required
def explain():
    d=data();code=d.get('code','');lang=d.get('language');locale=d.get('locale','en')
    if not isinstance(code,str) or len(code)>50000 or lang not in LANGUAGES or locale not in TEXT:return error('Invalid explanation request.')
    title,template=TEXT[locale]
    return jsonify(answer=title+': '+template.format(lang=lang,n=len(code.splitlines())),mode='rule-based')

init_db()
if __name__=='__main__':app.run(host='127.0.0.1',port=5000,debug=False)
