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
        s.connect(("10.255.255.255", 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = "127.0.0.1"
    finally:
        s.close()
    return IP


app = Flask(__name__)
app.config["SECRET_KEY"] = os.urandom(24)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///todo.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

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
    tasks = db.relationship("Task", backref="category", lazy=True)


class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(500))
    completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    day_of_week = db.Column(db.Integer)  # 0-6 for Monday-Sunday
    last_modified = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    priority = db.Column(db.Integer, default=2)  # 1=High, 2=Medium, 3=Low
    position = db.Column(db.Integer, default=0)  # For maintaining task order
    category = db.Column(db.String(50), default="daily")  # Add this line


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    tasks = Task.query.all()
    return jsonify([{
        'id': task.id,
        'title': task.title,
        'completed': task.completed,
        'category': task.category
    } for task in tasks])


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    socketio.run(app, host=get_ip(), port=5000, debug=True)
