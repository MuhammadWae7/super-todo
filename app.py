from flask import Flask, render_template, request, jsonify, redirect, url_for, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO, emit
from datetime import datetime, timedelta
import os
import socket
import json
import csv
from io import StringIO

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

class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    color = db.Column(db.String(7), default="#6c5ce7")  # Hex color code
    tasks = db.relationship('Task', backref='category', lazy=True)

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(500))
    completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    day_of_week = db.Column(db.Integer)  # 0-6 for Monday-Sunday
    last_modified = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    priority = db.Column(db.Integer, default=2)  # 1=High, 2=Medium, 3=Low
    position = db.Column(db.Integer, default=0)  # For maintaining task order

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
        'priority': task.priority,
        'position': task.position,
        'last_modified': task.last_modified.isoformat() if task.last_modified else None
    } for task in tasks])

@app.route('/api/tasks', methods=['POST'])
def create_task():
    data = request.json
    task = Task(
        title=data['title'],
        description=data.get('description', ''),
        day_of_week=data.get('day_of_week', 0),
        priority=data.get('priority', 2),
        position=data.get('position', 0)
    )
    db.session.add(task)
    db.session.commit()
    return jsonify({
        'id': task.id,
        'title': task.title,
        'description': task.description,
        'completed': task.completed,
        'day_of_week': task.day_of_week,
        'priority': task.priority,
        'position': task.position,
        'last_modified': task.last_modified.isoformat() if task.last_modified else None
    })

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    task = Task.query.get_or_404(task_id)
    data = request.json
    task.completed = data.get('completed', task.completed)
    task.title = data.get('title', task.title)
    task.description = data.get('description', task.description)
    task.priority = data.get('priority', task.priority)
    task.position = data.get('position', task.position)
    task.last_modified = datetime.utcnow()
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/categories', methods=['GET'])
def get_categories():
    categories = Category.query.all()
    return jsonify([{
        'id': category.id,
        'name': category.name,
        'color': category.color
    } for category in categories])

@app.route('/api/categories', methods=['POST'])
def create_category():
    data = request.json
    category = Category(name=data['name'], color=data.get('color', '#6c5ce7'))
    db.session.add(category)
    db.session.commit()
    return jsonify({
        'id': category.id,
        'name': category.name,
        'color': category.color
    })

@app.route('/api/tasks/export', methods=['GET'])
def export_tasks():
    tasks = Task.query.all()
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(['Title', 'Description', 'Completed', 'Day of Week', 'Priority'])
    
    for task in tasks:
        writer.writerow([
            task.title,
            task.description,
            task.completed,
            task.day_of_week,
            task.priority
        ])
    
    output.seek(0)
    return send_file(
        StringIO(output.getvalue()),
        mimetype='text/csv',
        as_attachment=True,
        download_name='tasks.csv'
    )

@app.route('/api/tasks/stats', methods=['GET'])
def get_task_stats():
    total_tasks = Task.query.count()
    completed_tasks = Task.query.filter_by(completed=True).count()
    tasks_by_priority = {
        'high': Task.query.filter_by(priority=1).count(),
        'medium': Task.query.filter_by(priority=2).count(),
        'low': Task.query.filter_by(priority=3).count()
    }
    tasks_by_category = {}
    for category in Category.query.all():
        tasks_by_category[category.name] = Task.query.filter_by(category_id=category.id).count()
    
    return jsonify({
        'total_tasks': total_tasks,
        'completed_tasks': completed_tasks,
        'completion_rate': (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0,
        'tasks_by_priority': tasks_by_priority,
        'tasks_by_category': tasks_by_category
    })

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