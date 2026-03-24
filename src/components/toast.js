const container = document.createElement('div');
container.className = 'toast-container';
document.body.appendChild(container);

export function toast(message, type = 'info', duration = 3000) {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateX(100%)';
        el.style.transition = 'all 0.3s';
        setTimeout(() => el.remove(), 300);
    }, duration);
}

export function toastSuccess(msg) { toast(msg, 'success'); }
export function toastError(msg) { toast(msg, 'error', 5000); }
export function toastInfo(msg) { toast(msg, 'info'); }
