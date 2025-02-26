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
    const dayTasks = tasks[activeDay] || [];
    let filteredTasks;
    if (currentCategory === 'all') {
      filteredTasks = dayTasks;
    } else {
      filteredTasks = dayTasks.filter(task => task.category === currentCategory);
    }
    if (filteredTasks.length > 0) {
      const section = createTaskSection(
        currentCategory === 'all' ? 'All Tasks' :
          `${currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1)} Tasks`
      );
      filteredTasks.forEach(task => {
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
    taskElement.innerHTML = `
              <div class="task-content">
                  <input type="checkbox" ${task.completed ? "checked" : ""}>
                  <span class="task-title" contenteditable="false">${task.title}</span>
              </div>
              <div class="task-actions">
                  <button class="edit-task">✎</button>
                  <button class="delete-task">×</button>
              </div>
          `;
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
      if (tasks[day] && Array.isArray(tasks[day])) {
        taskElement.style.animation = "slideOut 0.3s ease";
        setTimeout(() => {
          tasks[day] = tasks[day].filter(t => t.id !== task.id);
          saveAndUpdate();
          renderTasks();
        }, 300);
      }
    });
    return taskElement;
  }
  function addNewTask() {
    const taskText = newTaskInput.value.trim();
    if (taskText) {
      const activeDay = document.querySelector(".day-tab.active").dataset.day;
      const newTask = {
        id: Date.now(),
        title: taskText,
        completed: false,
        category: currentCategory === 'all' ? 'daily' : currentCategory,
        created: new Date().toISOString()
      };
      if (currentCategory === 'daily' || currentCategory === 'all') {
        tasks[activeDay].push(newTask);
      } else {
        for (let i = 0; i < 7; i++) {
          if (!tasks[i]) tasks[i] = [];
          tasks[i].push({ ...newTask });
        }
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
  function sendSyncData() {
    if (window.socket && window.socket.connected) {
      window.socket.emit("sync", { tasks });
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
}); // Close DOMContentLoaded event listener
