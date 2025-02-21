document.addEventListener("DOMContentLoaded", () => {
  let currentDay = 0;
  let tasks = {};

  // Initialize tasks for each day
  for (let i = 0; i < 7; i++) {
    tasks[i] = [];
  }

  const tasksContainer = document.getElementById("tasks-list");
  const newTaskInput = document.getElementById("new-task-input");
  const addTaskBtn = document.getElementById("add-task-btn");
  const dayTabs = document.querySelectorAll(".day-tab");
  const achievementModal = document.getElementById("achievement-modal");
  const closeModalBtn = document.querySelector(".close-modal");
  const themeToggle = document.getElementById("theme-toggle");

  // Theme handling
  const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
  const currentTheme = localStorage.getItem("theme");

  if (currentTheme) {
    document.documentElement.setAttribute("data-theme", currentTheme);
    updateThemeIcon(currentTheme);
  } else if (prefersDarkScheme.matches) {
    document.documentElement.setAttribute("data-theme", "dark");
    updateThemeIcon("dark");
  }

  themeToggle.addEventListener("click", () => {
    let theme = document.documentElement.getAttribute("data-theme");
    let newTheme = theme === "light" ? "dark" : "light";

    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateThemeIcon(newTheme);
  });

  function updateThemeIcon(theme) {
    const iconPath = themeToggle.querySelector("path");
    if (theme === "dark") {
      iconPath.setAttribute(
        "d",
        "M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
      );
    } else {
      iconPath.setAttribute(
        "d",
        "M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"
      );
    }
  }

  // Load tasks from server
  fetchTasks();

  // Event Listeners
  addTaskBtn.addEventListener("click", addNewTask);
  newTaskInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addNewTask();
    }
  });

  dayTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const day = parseInt(tab.dataset.day);
      switchDay(day);
    });
  });

  closeModalBtn.addEventListener("click", () => {
    achievementModal.style.display = "none";
  });
  // Theme Toggle
  document.getElementById("theme-toggle").addEventListener("click", () => {
      document.documentElement.setAttribute(
          "data-theme",
          document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark"
      );
  });
  // Initialize
  document.addEventListener("DOMContentLoaded", () => {
      // Add task button functionality
      const addTaskBtn = document.getElementById("add-task-btn");
      const newTaskInput = document.getElementById("new-task-input");
      // Task Management
      let tasks = JSON.parse(localStorage.getItem("tasks")) || {};
      function addTask(title, day) {
          if (!tasks[day]) {
              tasks[day] = [];
          }
          tasks[day].push({
              id: Date.now(),
              title: title,
              completed: false
          });
          saveAndUpdate();
      }
      function saveAndUpdate() {
          localStorage.setItem("tasks", JSON.stringify(tasks));
          renderTasks();
          updateProgress();
          sendSyncData();
      }
      function renderTasks() {
          const activeDay = document.querySelector(".day-tab.active").dataset.day;
          const tasksList = document.getElementById("tasks-list");
          const dayTasks = tasks[activeDay] || [];
          tasksList.innerHTML = "";
          tasksList.style.display = dayTasks.length ? "block" : "none";
          if (dayTasks.length) {
              dayTasks.forEach(task => createTaskElement(task, activeDay));
          }
      }
      function createTaskElement(task, day) {
          const taskElement = document.createElement("div");
          taskElement.className = `task-item ${task.completed ? "completed" : ""}`;
          taskElement.innerHTML = `
              <input type="checkbox" ${task.completed ? "checked" : ""}>
              <span class="task-title">${task.title}</span>
              <button class="delete-task">×</button>
          `;
          taskElement.querySelector("input").addEventListener("change", (e) => {
              task.completed = e.target.checked;
              taskElement.classList.toggle("completed", task.completed);
              saveAndUpdate();
          });
          taskElement.querySelector(".delete-task").addEventListener("click", () => {
              tasks[day] = tasks[day].filter(t => t.id !== task.id);
              saveAndUpdate();
          });
          document.getElementById("tasks-list").appendChild(taskElement);
      }
      function updateProgress() {
          const allTasks = Object.values(tasks).flat();
          const percentage = allTasks.length ? 
              Math.round((allTasks.filter(task => task.completed).length / allTasks.length) * 100) : 0;
          document.getElementById("progress-percentage").textContent = `${percentage}%`;
          document.getElementById("progress-fill").style.width = `${percentage}%`;
      }
  });
  // Check for monthly milestone
  const startDate = localStorage.getItem("startDate");
  if (!startDate) {
    localStorage.setItem("startDate", new Date().toISOString());
  } else {
    const monthAgo = new Date(startDate);
    const today = new Date();
    const diffTime = Math.abs(today - monthAgo);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  // Show monthly achievement notification
  const monthlyMessage = document.createElement("div");
  monthlyMessage.className = "monthly-message";
  monthlyMessage.textContent =
    "🎉 Congratulations on maintaining your routine for a month! Would you like to adjust your daily plan?";
  document.querySelector("header").appendChild(monthlyMessage);
  }
});
