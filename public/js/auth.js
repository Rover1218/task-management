export class Auth {
    constructor(statusMessageCallback, onLoginSuccess) {
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
        console.log('handleLogin called'); // Log method call
        event.preventDefault();
        try {
            const formData = new FormData(event.target);
            console.log('Login request:', Object.fromEntries(formData)); // Log the request data
            const response = await fetch('/login', {
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
        console.log('handleRegister called'); // Log method call
        event.preventDefault();
        try {
            const formData = new FormData(event.target);
            console.log('Register request:', Object.fromEntries(formData)); // Log the request data
            const response = await fetch('/register', {
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
        console.log('handleLogout called'); // Log method call
        try {
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            if (token) {
                console.log('Logout request with token:', token); // Log the token
                await fetch('/logout', {
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