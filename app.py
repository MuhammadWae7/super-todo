from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO, emit
from datetime import datetime, timedelta
import os
import socket
import json

def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # doesn't even have to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

app = Flask(__name__)
app.config['SECRET_KEY'] = os.urandom(24)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///todo.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy()
socketio = SocketIO(app, cors_allowed_origins="*")
db.init_app(app)

# Store connected clients
connected_clients = set()
last_known_state = {}

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(500))
    completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    day_of_week = db.Column(db.Integer)  # 0-6 for Monday-Sunday
    last_modified = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class WeeklyProgress(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    week_start = db.Column(db.DateTime, nullable=False)
    completion_rate = db.Column(db.Float, default=0.0)

with app.app_context():
    db.create_all()

@socketio.on('connect')
def handle_connect():
    connected_clients.add(request.sid)
    print(f'Client connected: {request.sid}')
    if last_known_state:
        emit('sync', {'type': 'sync', 'data': last_known_state}, room=request.sid)

@socketio.on('disconnect')
def handle_disconnect():
    connected_clients.remove(request.sid)
    print(f'Client disconnected: {request.sid}')

@socketio.on('sync')
def handle_sync(data):
    global last_known_state
    if data.get('tasks'):
        last_known_state = data['tasks']
        # Broadcast to all other clients
        for client_sid in connected_clients:
            if client_sid != request.sid:
                emit('sync', {'type': 'sync', 'data': last_known_state}, room=client_sid)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    tasks = Task.query.all()
    return jsonify([{
        'id': task.id,
        'title': task.title,
        'description': task.description,
        'completed': task.completed,
        'day_of_week': task.day_of_week,
        'last_modified': task.last_modified.isoformat() if task.last_modified else None
    } for task in tasks])

@app.route('/api/tasks', methods=['POST'])
def create_task():
    data = request.json
    task = Task(
        title=data['title'],
        description=data.get('description', ''),
        day_of_week=data.get('day_of_week', 0)
    )
    db.session.add(task)
    db.session.commit()
    return jsonify({
        'id': task.id,
        'title': task.title,
        'description': task.description,
        'completed': task.completed,
        'day_of_week': task.day_of_week,
        'last_modified': task.last_modified.isoformat() if task.last_modified else None
    })

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    task = Task.query.get_or_404(task_id)
    data = request.json
    task.completed = data.get('completed', task.completed)
    task.last_modified = datetime.utcnow()
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/progress', methods=['GET'])
def get_progress():
    today = datetime.utcnow()
    week_start = today - timedelta(days=today.weekday())
    progress = WeeklyProgress.query.filter_by(week_start=week_start.date()).first()
    if not progress:
        return jsonify({'completion_rate': 0.0})
    return jsonify({'completion_rate': progress.completion_rate})

if __name__ == '__main__':
    ip = get_ip()
    print(f"\nAccess the app on your phone at: http://{ip}:5000\n")
    socketio.run(app, debug=True, host='0.0.0.0', port=5000) 