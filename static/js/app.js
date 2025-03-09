document.addEventListener("DOMContentLoaded", () => {
  // Initialize state
  let tasks = JSON.parse(localStorage.getItem("tasks")) || {};
  let currentDay = 0;
  let currentCategory = 'all';
  // Initialize tasks for each day if empty
  for (let i = 0; i < 7; i++) {
    if (!tasks[i]) tasks[i] = [];
  }
  // DOM Elements
  const tasksContainer = document.getElementById("tasks-list");
  const newTaskInput = document.getElementById("new-task-input");
  const addTaskBtn = document.getElementById("add-task-btn");
  const dayTabs = document.querySelectorAll(".day-tab");
  const filterBtns = document.querySelectorAll(".filter-btn");
  const themeToggle = document.getElementById("theme-toggle");
  function createTaskSection(title) {
    const section = document.createElement('div');
    section.className = 'category-section';
    section.innerHTML = `<h3 class="category-title">${title}</h3>`;
    return section;
  }
  function renderTasks() {
    const activeDay = parseInt(document.querySelector(".day-tab.active").dataset.day);
    tasksContainer.innerHTML = "";

    // Get tasks for the current day
    const dayTasks = tasks[activeDay] || [];
    let filteredTasks;

    if (currentCategory === 'all') {
      // For 'all' category, include tasks from other days if they are weekly
      const allDayTasks = [...dayTasks];

      // Check other days for weekly tasks if we're not showing them already
      for (let day = 0; day < 7; day++) {
        if (day !== activeDay && tasks[day]) {
          const weeklyTasks = tasks[day].filter(task =>
            (task.category === 'weekly' || task.category === 'daily') &&
            !allDayTasks.some(t => t.title === task.title)
          );
          allDayTasks.push(...weeklyTasks);
        }
      }
      filteredTasks = allDayTasks;
    } else {
      // For specific categories, include weekly tasks from other days
      if (currentCategory === 'weekly' || currentCategory === 'daily') {
        const categoryTasks = [];
        // Collect tasks from all days
        for (let day = 0; day < 7; day++) {
          if (tasks[day]) {
            const daysCategoryTasks = tasks[day].filter(task =>
              task.category === currentCategory &&
              !categoryTasks.some(t => t.title === task.title)
            );
            categoryTasks.push(...daysCategoryTasks);
          }
        }
        filteredTasks = categoryTasks;
      } else {
        // For other categories, just show tasks from current day
        filteredTasks = dayTasks.filter(task => task.category === currentCategory);
      }
    }

    // Group tasks by category when showing all
    if (currentCategory === 'all' && filteredTasks.length > 0) {
      const categories = [...new Set(filteredTasks.map(task => task.category))];
      categories.forEach(category => {
        const categoryTasks = filteredTasks.filter(task => task.category === category);
        if (categoryTasks.length > 0) {
          const section = createTaskSection(
            `${category.charAt(0).toUpperCase() + category.slice(1)} Tasks`
          );
          // Remove duplicate tasks based on title
          const uniqueTasks = categoryTasks.filter((task, index, self) =>
            index === self.findIndex(t => t.title === task.title)
          );
          uniqueTasks.forEach(task => {
            section.appendChild(createTaskElement(task, activeDay));
          });
          tasksContainer.appendChild(section);
        }
      });
    } else if (filteredTasks.length > 0) {
      const section = createTaskSection(
        `${currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1)} Tasks`
      );
      // Remove duplicate tasks based on title
      const uniqueTasks = filteredTasks.filter((task, index, self) =>
        index === self.findIndex(t => t.title === task.title)
      );
      uniqueTasks.forEach(task => {
        section.appendChild(createTaskElement(task, activeDay));
      });
      tasksContainer.appendChild(section);
    } else {
      tasksContainer.innerHTML = `<div class="empty-state">No ${currentCategory} tasks found</div>`;
    }
  }
  function createTaskElement(task, day) {
    const taskElement = document.createElement("div");
    taskElement.className = `task-item ${task.completed ? "completed" : ""}`;
    taskElement.style.animation = "slideIn 0.3s ease";
    taskElement.draggable = true;
    
    // Calculate priority (high, medium, low)
    const priorityClass = task.priority === 1 ? 'priority-high' : 
                         (task.priority === 3 ? 'priority-low' : 'priority-medium');
    const priorityText = task.priority === 1 ? 'High' : 
                        (task.priority === 3 ? 'Low' : 'Medium');
    
    // Format date
    const taskDate = task.created ? new Date(task.created) : new Date();
    const formattedDate = taskDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    taskElement.innerHTML = `
        <div class="task-content">
            <span class="drag-handle">≡</span>
            <input type="checkbox" ${task.completed ? "checked" : ""}>
            <div class="task-meta">
                <span class="task-title">${task.title}</span>
                <div class="task-details">
                    <span class="task-date">${formattedDate}</span>
                    <span class="task-priority ${priorityClass}">${priorityText}</span>
                </div>
            </div>
        </div>
        <div class="task-actions">
            <button class="edit-task">✎</button>
            <button class="delete-task">×</button>
        </div>
    `;

    let touchStartY = 0;
    let currentDrag = null;

    // Touch event handlers for mobile drag and drop
    const dragHandle = taskElement.querySelector('.drag-handle');

    dragHandle.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      touchStartY = touch.clientY;
      currentDrag = taskElement;
      taskElement.classList.add('dragging');

      // Add visual feedback
      dragHandle.style.transform = 'scale(1.1)';

      // Vibrate if supported
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      e.preventDefault(); // Prevent scrolling while dragging
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
      if (!currentDrag) return;

      const touch = e.touches[0];
      const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
      const targetTask = elements.find(el => el.classList.contains('task-item') && el !== currentDrag);

      if (targetTask) {
        const targetRect = targetTask.getBoundingClientRect();
        const targetMiddle = targetRect.top + targetRect.height / 2;

        if (touch.clientY < targetMiddle && targetTask.previousElementSibling !== currentDrag) {
          targetTask.parentNode.insertBefore(currentDrag, targetTask);
          // Vibrate if supported
          if (navigator.vibrate) {
            navigator.vibrate(20);
          }
        } else if (touch.clientY > targetMiddle && targetTask.nextElementSibling !== currentDrag) {
          targetTask.parentNode.insertBefore(currentDrag, targetTask.nextElementSibling);
          // Vibrate if supported
          if (navigator.vibrate) {
            navigator.vibrate(20);
          }
        }
      }

      e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchend', () => {
      if (currentDrag) {
        currentDrag.classList.remove('dragging');
        if (dragHandle) {
          dragHandle.style.transform = '';
        }
        updateTaskOrder();
        currentDrag = null;

        // Final vibration feedback
        if (navigator.vibrate) {
          navigator.vibrate([30, 50, 30]);
        }
      }
    });

    // Desktop drag and drop event listeners
    taskElement.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', task.title);
      taskElement.classList.add('dragging');
    });

    taskElement.addEventListener('dragend', () => {
      taskElement.classList.remove('dragging');
    });

    taskElement.addEventListener('dragover', (e) => {
      e.preventDefault();
      const draggingElement = document.querySelector('.dragging');
      if (draggingElement && draggingElement !== taskElement) {
        const taskBox = taskElement.getBoundingClientRect();
        const offset = e.clientY - taskBox.top - (taskBox.height / 2);

        if (offset < 0 && taskElement.previousElementSibling !== draggingElement) {
          taskElement.parentNode.insertBefore(draggingElement, taskElement);
        } else if (offset > 0 && taskElement.nextElementSibling !== draggingElement) {
          taskElement.parentNode.insertBefore(draggingElement, taskElement.nextElementSibling);
        }

        updateTaskOrder();
      }
    });

    const checkbox = taskElement.querySelector("input");
    const titleSpan = taskElement.querySelector(".task-title");
    const editBtn = taskElement.querySelector(".edit-task");
    const deleteBtn = taskElement.querySelector(".delete-task");
    checkbox.addEventListener("change", () => {
      task.completed = checkbox.checked;
      taskElement.classList.toggle("completed", task.completed);
      saveAndUpdate();
    });
    editBtn.addEventListener("click", () => {
      titleSpan.contentEditable = titleSpan.contentEditable === "true" ? "false" : "true";
      editBtn.textContent = titleSpan.contentEditable === "true" ? "✓" : "✎";

      if (titleSpan.contentEditable === "true") {
        titleSpan.focus();
      } else {
        task.title = titleSpan.textContent.trim();
        saveAndUpdate();
      }
    });
    titleSpan.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        editBtn.click();
      }
    });
    deleteBtn.addEventListener("click", () => {
      taskElement.style.animation = "slideOut 0.3s ease";
      setTimeout(() => {
        if (task.category === 'weekly' || task.category === 'daily') {
          // Delete from all days
          for (let i = 0; i < 7; i++) {
            if (tasks[i]) {
              tasks[i] = tasks[i].filter(t => t.title !== task.title);
            }
          }
        } else {
          // Delete only from current day
          tasks[day] = tasks[day].filter(t => t.id !== task.id);
        }
        saveAndUpdate();
        renderTasks();
      }, 300);
    });
    return taskElement;
  }
  function updateTaskOrder() {
    const activeDay = parseInt(document.querySelector(".day-tab.active").dataset.day);
    const taskElements = document.querySelectorAll('.task-item');
    const newOrder = Array.from(taskElements).map(el => el.querySelector('.task-title').textContent);

    // Reorder tasks array based on new order
    const reorderedTasks = [];
    newOrder.forEach(title => {
      const task = tasks[activeDay].find(t => t.title === title);
      if (task) reorderedTasks.push(task);
    });

    tasks[activeDay] = reorderedTasks;
    saveAndUpdate();
  }
  function addNewTask() {
    const taskText = newTaskInput.value.trim();
    if (taskText) {
      const activeDay = parseInt(document.querySelector(".day-tab.active").dataset.day);
      const newTask = {
        id: Date.now(),
        title: taskText,
        completed: false,
        category: currentCategory === 'all' ? 'daily' : currentCategory,
        created: new Date().toISOString(),
        priority: Math.floor(Math.random() * 3) + 1 // Random priority: 1 (high), 2 (medium), 3 (low)
      };

      // Handle tasks that should appear across all days
      if (currentCategory === 'daily' || currentCategory === 'weekly') {
        // Add the task to all days
        for (let i = 0; i < 7; i++) {
          if (!tasks[i]) tasks[i] = [];
          tasks[i].push({ ...newTask, id: Date.now() + i }); // Unique ID for each day
        }
      } else {
        // Add the task only to the current day
        if (!tasks[activeDay]) tasks[activeDay] = [];
        tasks[activeDay].push(newTask);
      }

      newTaskInput.value = "";
      saveAndUpdate();
      renderTasks();
    }
  }
  function saveAndUpdate() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
    updateProgress();
    sendSyncData();
  }
  function updateProgress() {
    const allTasks = Object.values(tasks).flat();
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(task => task.completed).length;
    const percentage = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
    document.getElementById("progress-percentage").textContent = `${percentage}%`;
    document.getElementById("progress-fill").style.width = `${percentage}%`;
  }
  function downloadTasks() {
    const data = {
        tasks: tasks,
        exportDate: new Date().toISOString(),
        version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks-backup-${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
  function updateSyncStatus(status, success = true) {
    const syncStatus = document.querySelector(".sync-status");
    const syncText = document.querySelector(".sync-text");
    
    syncText.textContent = status;
    syncStatus.classList.toggle("connected", success);
    
    // Auto-hide success messages after 3 seconds
    if (success && status !== "Connected") {
        setTimeout(() => {
            syncText.textContent = window.socket?.connected ? "Connected" : "Offline";
            syncStatus.classList.toggle("connected", window.socket?.connected);
        }, 3000);
    }
  }
  function sendSyncData() {
    if (window.socket?.connected) {
        window.socket.emit("sync", { tasks });
        updateSyncStatus("Syncing...", true);
    } else {
        updateSyncStatus("Offline", false);
    }
  }
  // Event Listeners
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelector(".filter-btn.active")?.classList.remove("active");
      btn.classList.add("active");
      currentCategory = btn.dataset.filter;
      renderTasks();
    });
  });
  addTaskBtn.addEventListener("click", addNewTask);

  newTaskInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addNewTask();
  });

  dayTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelector(".day-tab.active")?.classList.remove("active");
      tab.classList.add("active");
      renderTasks();
    });
  });

  themeToggle?.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  });
  // Initialize
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  dayTabs[0].classList.add('active');
  renderTasks();
  updateProgress();

  // Enhance sync connection handling
  if (window.socket) {
    window.socket.on("connect", () => {
        updateSyncStatus("Connected", true);
        sendSyncData(); // Sync immediately when connected
    });

    window.socket.on("sync_success", () => {
        updateSyncStatus("Sync complete!", true);
    });

    window.socket.on("sync_error", () => {
        updateSyncStatus("Sync failed", false);
    });

    window.socket.on("disconnect", () => {
        updateSyncStatus("Offline", false);
    });
  }

  // Add event listeners at the end of the DOMContentLoaded callback
  const downloadBtn = document.createElement('button');
  downloadBtn.className = 'download-btn';
  downloadBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
  downloadBtn.setAttribute('title', 'Download tasks');
  document.querySelector('header').appendChild(downloadBtn);

  downloadBtn.addEventListener('click', downloadTasks);
}); // Close DOMContentLoaded event listener
