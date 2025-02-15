document.addEventListener('DOMContentLoaded', () => {
    let currentDay = 0;
    let tasks = {};
    
    // Initialize tasks for each day
    for (let i = 0; i < 7; i++) {
        tasks[i] = [];
    }

    const tasksContainer = document.getElementById('tasks-list');
    const newTaskInput = document.getElementById('new-task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const dayTabs = document.querySelectorAll('.day-tab');
    const achievementModal = document.getElementById('achievement-modal');
    const closeModalBtn = document.querySelector('.close-modal');
    const themeToggle = document.getElementById('theme-toggle');

    // Theme handling
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const currentTheme = localStorage.getItem('theme');
    
    if (currentTheme) {
        document.documentElement.setAttribute('data-theme', currentTheme);
        updateThemeIcon(currentTheme);
    } else if (prefersDarkScheme.matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
        updateThemeIcon('dark');
    }

    themeToggle.addEventListener('click', () => {
        let theme = document.documentElement.getAttribute('data-theme');
        let newTheme = theme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });

    function updateThemeIcon(theme) {
        const iconPath = themeToggle.querySelector('path');
        if (theme === 'dark') {
            iconPath.setAttribute('d', 'M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z');
        } else {
            iconPath.setAttribute('d', 'M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z');
        }
    }

    // Load tasks from server
    fetchTasks();

    // Event Listeners
    addTaskBtn.addEventListener('click', addNewTask);
    newTaskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addNewTask();
        }
    });

    dayTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const day = parseInt(tab.dataset.day);
            switchDay(day);
        });
    });

    closeModalBtn.addEventListener('click', () => {
        achievementModal.style.display = 'none';
    });

    // Functions
    async function fetchTasks() {
        try {
            const response = await fetch('/api/tasks');
            const data = await response.json();
            
            // Group tasks by day
            data.forEach(task => {
                tasks[task.day_of_week].push(task);
            });
            
            renderTasks();
            updateProgress();
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    }

    async function addNewTask() {
        const title = newTaskInput.value.trim();
        if (!title) return;

        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title,
                    day_of_week: currentDay
                })
            });

            const task = await response.json();
            tasks[currentDay].push(task);
            
            renderTasks();
            updateProgress();
            newTaskInput.value = '';
        } catch (error) {
            console.error('Error adding task:', error);
        }
    }

    async function toggleTask(taskId, completed) {
        try {
            await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ completed })
            });

            // Update local task state
            for (let day in tasks) {
                const task = tasks[day].find(t => t.id === taskId);
                if (task) {
                    task.completed = completed;
                    break;
                }
            }

            updateProgress();
            checkWeeklyCompletion();
        } catch (error) {
            console.error('Error updating task:', error);
        }
    }

    async function deleteTask(taskId) {
        try {
            await fetch(`/api/tasks/${taskId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            // Remove task from local state
            for (let day in tasks) {
                tasks[day] = tasks[day].filter(t => t.id !== taskId);
            }

            renderTasks();
            updateProgress();
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    }

    function renderTasks() {
        tasksContainer.innerHTML = '';
        
        tasks[currentDay].forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
            taskElement.draggable = true;
            
            taskElement.innerHTML = `
                <div class="task-drag-handle">
                    <svg width="16" height="16" viewBox="0 0 16 16">
                        <path d="M4 4h2v2H4V4zm6 0h2v2h-2V4zM4 9h2v2H4V9zm6 0h2v2h-2V9z" fill="currentColor"/>
                    </svg>
                </div>
                <label class="modern-checkbox">
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                    <span class="checkmark">
                        <svg viewBox="0 0 24 24" class="checkmark-icon">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                        </svg>
                    </span>
                </label>
                <span class="task-title" contenteditable="true">${task.title}</span>
                <span class="task-duration-badge ${task.duration}">${getDurationLabel(task.duration)}</span>
                <div class="task-actions">
                    <button class="save-task" aria-label="Save task" style="display: none;">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M13.3334 5.33333L6.00002 12.6667L2.66669 9.33333" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <button class="delete-task" aria-label="Delete task">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4m2 0v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4h9.334z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            `;

            const checkbox = taskElement.querySelector('.task-checkbox');
            checkbox.addEventListener('change', () => {
                toggleTask(task.id, checkbox.checked);
            });

            const deleteButton = taskElement.querySelector('.delete-task');
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this task?')) {
                    deleteTask(task.id);
                }
            });

            tasksContainer.appendChild(taskElement);
        });
    }

    function switchDay(day) {
        currentDay = day;
        
        // Update active tab
        dayTabs.forEach(tab => {
            tab.classList.remove('active');
            if (parseInt(tab.dataset.day) === day) {
                tab.classList.add('active');
            }
        });

        renderTasks();
    }

    function updateProgress() {
        const totalTasks = Object.values(tasks).flat().length;
        const completedTasks = Object.values(tasks).flat().filter(task => task.completed).length;
        const progressPercentage = totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;

        document.getElementById('progress-percentage').textContent = `${Math.round(progressPercentage)}%`;
        document.getElementById('progress-fill').style.width = `${progressPercentage}%`;
    }

    function checkWeeklyCompletion() {
        const allTasks = Object.values(tasks).flat();
        const allCompleted = allTasks.length > 0 && allTasks.every(task => task.completed);

        if (allCompleted) {
            achievementModal.style.display = 'flex';
        }
    }

    // Check for monthly milestone
    const startDate = localStorage.getItem('startDate');
    if (!startDate) {
        localStorage.setItem('startDate', new Date().toISOString());
    } else {
        const monthAgo = new Date(startDate);
        const today = new Date();
        const diffTime = Math.abs(today - monthAgo);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= 30) {
            // Show monthly achievement notification
            const monthlyMessage = document.createElement('div');
            monthlyMessage.className = 'monthly-message';
            monthlyMessage.textContent = '🎉 Congratulations on maintaining your routine for a month! Would you like to adjust your daily plan?';
            document.querySelector('header').appendChild(monthlyMessage);
        }
    }
}); 