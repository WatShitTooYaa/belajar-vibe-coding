import { app } from '../index';

export const randomString = () => Math.random().toString(36).slice(2, 10);

export const createUserPayload = () => ({
    email: `test-${randomString()}@example.com`,
    username: `user-${randomString()}`,
    password: 'password123',
});

export const parseCookies = (setCookie: string[]) => {
    const cookies: Record<string, string> = {};
    for (const cookie of setCookie) {
        const [pair] = cookie.split(';');
        if (!pair) continue;
        const [key, value] = pair.split('=');
        if (!key || !value) continue;
        cookies[key] = value;
    }
    return cookies;
};

export const registerUser = async (payload: ReturnType<typeof createUserPayload>) => {
    return app.handle(new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }));
};

export const loginUser = async (payload: Pick<ReturnType<typeof createUserPayload>, 'email' | 'password'>) => {
    return app.handle(new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }));
};

export const loginAndGetCookies = async (payload: Pick<ReturnType<typeof createUserPayload>, 'email' | 'password'>) => {
    const response = await loginUser(payload);
    const cookies = parseCookies(response.headers.getSetCookie());
    return { response, cookies };
};

export const createWorkspace = async (accessToken: string, name = `workspace-${randomString()}`) => {
    return app.handle(new Request('http://localhost/api/v1/workspaces', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Cookie: `access_token=${accessToken}`
        },
        body: JSON.stringify({ name })
    }));
};

export const getWorkspaces = async (accessToken: string) => {
    return app.handle(new Request('http://localhost/api/v1/workspaces', {
        method: 'GET',
        headers: {
            Cookie: `access_token=${accessToken}`
        }
    }));
};

export const getWorkspaceIdByName = async (accessToken: string, name: string) => {
    const response = await getWorkspaces(accessToken);
    const body = await response.json() as { data: Array<{ id: number; name: string }> };
    return body.data.find((workspace) => workspace.name === name)?.id;
};

export const addMember = async (accessToken: string, workspaceId: number, email: string, role: 'editor' | 'watcher') => {
    return app.handle(new Request(`http://localhost/api/v1/workspaces/${workspaceId}/members`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Cookie: `access_token=${accessToken}`
        },
        body: JSON.stringify({ email, role })
    }));
};

export const getMembers = async (accessToken: string, workspaceId: number) => {
    return app.handle(new Request(`http://localhost/api/v1/workspaces/${workspaceId}/members`, {
        method: 'GET',
        headers: {
            Cookie: `access_token=${accessToken}`
        }
    }));
};

export const createTask = async (accessToken: string, workspaceId: number, body?: { title: string; isCompleted: boolean; deadline: string }) => {
    return app.handle(new Request(`http://localhost/api/v1/workspaces/${workspaceId}/tasks`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Cookie: `access_token=${accessToken}`
        },
        body: JSON.stringify(body ?? {
            title: `task-${randomString()}`,
            isCompleted: false,
            deadline: '2030-01-01T10:00:00.000Z'
        })
    }));
};

export const getTasks = async (accessToken: string, workspaceId: number) => {
    return app.handle(new Request(`http://localhost/api/v1/workspaces/${workspaceId}/tasks`, {
        method: 'GET',
        headers: {
            Cookie: `access_token=${accessToken}`
        }
    }));
};
