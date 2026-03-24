const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
    return localStorage.getItem('auth_token');
}

export async function api(path, options = {}) {
    const token = getToken();
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });
    if (res.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login.html';
        throw new Error('Phiên đăng nhập hết hạn');
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || `Lỗi ${res.status}`);
    }
    return res.json();
}

export function apiGet(path) { return api(path); }
export function apiPost(path, body) { return api(path, { method: 'POST', body: JSON.stringify(body) }); }
export function apiDelete(path) { return api(path, { method: 'DELETE' }); }
