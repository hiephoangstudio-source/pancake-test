export function checkAuth() {
    const token = localStorage.getItem('auth_token');
    if (!token && !window.location.pathname.includes('login')) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

export function logout() {
    localStorage.removeItem('auth_token');
    window.location.href = '/login.html';
}

export function getUser() {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload;
    } catch { return null; }
}
