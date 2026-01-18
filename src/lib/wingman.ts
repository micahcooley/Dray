export class WingmanClient {
    static async getPreview(type: string, prompt: string) {
        const response = await fetch('/api/wingman/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, prompt })
        });
        return response.json();
    }

    static async startJob(type: string, options: any) {
        const response = await fetch('/api/wingman/job', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, options })
        });
        return response.json();
    }

    static async linkProvider(provider: string, key: string) {
        const response = await fetch('/api/wingman/link-provider', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider, key })
        });
        return response.json();
    }
}
