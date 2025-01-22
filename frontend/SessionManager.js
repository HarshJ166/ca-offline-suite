class SessionManager {
    constructor() {
        this.store = null;
        this._user = null;

        this.init();
    }

    async init() {
        const { default: Store } = await import('electron-store');
        this.store = new Store({
            encryptionKey: process.env.NODE_ENV === 'production' ? 'your-encryption-key' : undefined,
            name: 'session'
        });

        this._user = this.store.get('user') || null;

        console.log('SessionManager initialized', "User:", this._user, " Store: ", this.store);
    }

    get user() {
        return this._user;
    }

    isAuthenticated() {
        return this._user !== null;
    }

    setUser(userData) {
        this._user = userData;
        this.store.set('user', userData);
        return { success: true };
    }

    clearUser() {
        this._user = null;
        this.store.delete('user');
        return { success: true };
    }

    updateUser(userData) {
        return this.setUser({ ...this._user, ...userData });
    }
}

// Create and export singleton instance
const sessionManager = new SessionManager();
module.exports = sessionManager;