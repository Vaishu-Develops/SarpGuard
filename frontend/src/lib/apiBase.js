export function getApiBaseUrl() {
    if (typeof window === 'undefined') {
        return '';
    }

    const hostname = window.location.hostname;
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.endsWith('.local');

    if (isLocalHost) {
        return '';
    }

    const configuredUrl = import.meta.env.VITE_API_URL?.trim();
    if (configuredUrl) {
        return configuredUrl.replace(/\/$/, '');
    }

    return window.location.origin.replace(/\/$/, '');
}