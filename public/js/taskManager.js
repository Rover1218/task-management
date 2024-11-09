export class TaskManager {
    constructor(statusMessageCallback) {
        this.showMessage = statusMessageCallback;
        this.taskList = document.getElementById('taskList');
        this.taskForm = document.getElementById('taskForm');
        this.setupEventListeners();
    }

    getAuthHeaders() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            throw new Error('No authentication token found');
        }
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    setupEventListeners() {
        this.taskForm.addEventListener('submit', (e) => this.handleAddTask(e));
    }

    async loadTasks() {
        try {
            if (!localStorage.getItem('authToken')) {
                return;
            }

            const response = await fetch('/getTasks', {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                // Handle unauthorized or invalid token
                if (response.status === 401) {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('userData');
                    window.location.reload();
                    return;
                }
                throw new Error('Failed to load tasks');
            }

            const data = await response.json();
            this.taskList.innerHTML = '';

            data.tasks.forEach(task => {
                const taskItem = document.createElement('div');
                taskItem.className = 'task-item';
                taskItem.innerHTML = `
                    <span class="delete-btn" data-task-id="${task.id}">×</span>
                    <h4>${task.task_name}</h4>
                    <p>${task.description}</p>
                    <p>Due: ${task.due_date}</p>
                    <p>Priority: ${task.priority}</p>
                `;
                taskItem.querySelector('.delete-btn').addEventListener('click', (e) => this.handleDeleteTask(e));
                this.taskList.appendChild(taskItem);
            });
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.showMessage('Error loading tasks', true);
        }
    }

    async handleAddTask(event) {
        event.preventDefault();
        try {
            const formData = new FormData(event.target);
            const response = await fetch('/addTask', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(Object.fromEntries(formData))
            });
            const data = await response.json();

            if (data.success) {
                this.showMessage('Task added successfully');
                event.target.reset();
                await this.loadTasks();
            } else {
                this.showMessage('Failed to add task', true);
            }
        } catch (error) {
            this.showMessage('Error adding task', true);
        }
    }

    async handleDeleteTask(event) {
        const taskId = event.target.dataset.taskId;
        try {
            const response = await fetch(`/deleteTask/${taskId}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            const data = await response.json();

            if (data.success) {
                this.showMessage('Task deleted successfully');
                await this.loadTasks();
            } else {
                this.showMessage('Failed to delete task', true);
            }
        } catch (error) {
            this.showMessage('Error deleting task', true);
        }
    }
}