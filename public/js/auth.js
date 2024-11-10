export class Auth {
    constructor(statusMessageCallback, onLoginSuccess) {
        this.API_BASE_URL = 'https://task-management-six-rust.vercel.app'; // Add base URL
        this.showMessage = statusMessageCallback;
        this.onLoginSuccess = onLoginSuccess;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
    }

    async handleLogin(event) {
        event.preventDefault();
        try {
            const formData = new FormData(event.target);
            const response = await fetch(`${this.API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Object.fromEntries(formData))
            });
            const data = await response.json();

            if (data.success) {
                // Store both token and user data
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('userData', JSON.stringify(data.user || {}));
                document.getElementById('login').style.display = 'none';
                document.getElementById('register').style.display = 'none';
                document.getElementById('tasks').style.display = 'block';
                document.getElementById('logoutBtn').style.display = 'inline';
                this.showMessage('Login successful');
                this.onLoginSuccess();
            } else {
                this.showMessage(data.message || 'Login failed', true);
            }
        } catch (error) {
            this.showMessage('Error during login', true);
        }
    }

    async handleRegister(event) {
        event.preventDefault();
        try {
            const formData = new FormData(event.target);
            const response = await fetch(`${this.API_BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Object.fromEntries(formData))
            });
            const data = await response.json();

            if (data.success) {
                this.showMessage('Registration successful');
                event.target.reset();
            } else {
                this.showMessage(data.message || 'Registration failed', true);
            }
        } catch (error) {
            this.showMessage('Error during registration', true);
        }
    }

    async handleLogout() {
        try {
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            if (token) {
                await fetch(`${this.API_BASE_URL}/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            }
            localStorage.removeItem('authToken');
            sessionStorage.removeItem('authToken');
            document.getElementById('login').style.display = 'block';
            document.getElementById('register').style.display = 'block';
            document.getElementById('tasks').style.display = 'none';
            document.getElementById('logoutBtn').style.display = 'none';
            this.showMessage('Logged out successfully');
        } catch (error) {
            this.showMessage('Error during logout', true);
        }
    }

    logout() {
        try {
            // Clear authentication state
            localStorage.removeItem('authToken');
            sessionStorage.removeItem('authToken');

            // Return a resolved promise to maintain async consistency
            return Promise.resolve();
        } catch (error) {
            console.error('Logout error:', error);
            this.showMessage({ error: 'Logout failed' });
            return Promise.reject(error);
        }
    }

    isAuthenticated() {
        return !!localStorage.getItem('authToken');
    }
}