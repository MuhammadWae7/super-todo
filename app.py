from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
import os

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", os.urandom(24))
socketio = SocketIO(app, cors_allowed_origins="*")

# Store connected clients for sync
connected_clients = set()

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on("connect")
def handle_connect():
    connected_clients.add(request.sid)
    socketio.emit("connected", room=request.sid)

@socketio.on("disconnect")
def handle_disconnect():
    if request.sid in connected_clients:
        connected_clients.remove(request.sid)

@socketio.on("sync")
def handle_sync(data):
    try:
        # Broadcast the data to all other connected clients
        socketio.emit("sync", {"type": "sync", "data": data.get("tasks", {})}, 
                     broadcast=True, include_self=False)
        socketio.emit("sync_success", room=request.sid)
    except Exception as e:
        socketio.emit("sync_error", str(e), room=request.sid)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    socketio.run(app, host="0.0.0.0", port=port)
