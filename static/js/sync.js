let socket = null;
let syncRetryTimeout = null;
const RETRY_INTERVAL = 5000;

function connectToSyncServer() {
    try {
        socket = io();
        socket.on("connect", () => {
            updateSyncStatus("Connected");
            sendSyncData();
        });

        socket.on("sync", (data) => {
            if (data?.type === "sync" && data.data) {
                mergeTasks(data.data);
                renderTasks();
                updateProgress();
            }
        });

        socket.on("disconnect", () => {
            updateSyncStatus("Offline");
            scheduleReconnect();
        });

        socket.on("connect_error", () => {
            updateSyncStatus("Offline");
            scheduleReconnect();
        });
    } catch (error) {
        updateSyncStatus("Offline");
        scheduleReconnect();
    }
}

function sendSyncData() {
    if (socket?.connected) {
        socket.emit("sync", {
            type: "sync",
            tasks: tasks
        });
    }
}

function updateSyncStatus(status) {
    const syncStatus = document.querySelector(".sync-status");
    const syncText = document.querySelector(".sync-text");
    syncText.textContent = status;
    syncStatus.classList.toggle("connected", status === "Connected");
}

function scheduleReconnect() {
    clearTimeout(syncRetryTimeout);
    syncRetryTimeout = setTimeout(connectToSyncServer, RETRY_INTERVAL);
}

function mergeTasks(newTasks) {
    tasks = newTasks;
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

connectToSyncServer();