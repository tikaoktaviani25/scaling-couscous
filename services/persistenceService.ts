import { BotState, BrainConfig, ExecutionPoint, GlobalSettings, ErrorCategory, ExchangeName, BotStatus, BacktestResult, FullState } from "../types";

// VPS CONFIGURATION
const getApiUrl = () => {
    try {
        if (typeof window === 'undefined') return 'http://localhost:10000/api';
        if (!window.location) return 'http://localhost:10000/api';
        const hostname = window.location.hostname;
        if (!hostname || typeof hostname !== 'string' || hostname.trim() === '') return 'http://localhost:10000/api';
        if (hostname === 'localhost' || hostname === '127.0.0.1') return 'http://localhost:10000/api';
        return `http://${hostname}:10000/api`; 
    } catch (e) {
        return 'http://localhost:10000/api';
    }
};

const SAFE_API_URL = getApiUrl();

export class ServiceError extends Error {
    category: ErrorCategory;
    constructor(message: string, category: ErrorCategory) {
        super(message);
        this.category = category;
        this.name = 'ServiceError';
    }
}

class PersistenceService {
    async init(): Promise<boolean> {
        try {
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 2000); 
            const res = await fetch(`${SAFE_API_URL}/state`, { method: 'GET', signal: controller.signal });
            return res.ok;
        } catch (e) { return false; }
    }

    async loadFullState(): Promise<FullState | null> {
        try {
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 3000); 
            const res = await fetch(`${SAFE_API_URL}/state`, { signal: controller.signal });
            if (!res.ok) return null;
            return await res.json();
        } catch (e) { return null; }
    }

    async saveFullState(state: FullState): Promise<void> {
        try {
            const res = await fetch(`${SAFE_API_URL}/state`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(state)
            });
            if (!res.ok) throw new Error("Server rejected write");
        } catch (e) { console.warn("Write failed"); }
    }

    async runBacktest(): Promise<BacktestResult | null> {
        try {
             const res = await fetch(`${SAFE_API_URL}/backtest`, { method: 'POST' });
             if (!res.ok) return null;
             return await res.json();
        } catch (e) { return null; }
    }

    async factoryReset(): Promise<void> {
        await fetch(`${SAFE_API_URL}/reset`, { method: 'POST' });
    }
    
    async panicSell(): Promise<void> {
        await fetch(`${SAFE_API_URL}/panic`, { method: 'POST' });
    }
}

export const persistence = new PersistenceService();