import { describe, expect, it } from 'bun:test';
import {
    addMember,
    createTask,
    createUserPayload,
    createWorkspace,
    getTasks,
    getWorkspaceIdByName,
    loginAndGetCookies,
    registerUser,
    randomString,
} from './helpers';

describe('TASKS API - SECURITY', () => {
    it('non-member cannot list tasks', async () => {
        const owner = createUserPayload();
        const outsider = createUserPayload();

        await registerUser(owner);
        await registerUser(outsider);

        const ownerLogin = await loginAndGetCookies(owner);
        const outsiderLogin = await loginAndGetCookies(outsider);

        const workspaceName = `workspace-${randomString()}`;
        await createWorkspace(ownerLogin.cookies.access_token, workspaceName);

        const workspaceId = await getWorkspaceIdByName(ownerLogin.cookies.access_token, workspaceName);
        expect(workspaceId).toBeDefined();

        const response = await getTasks(outsiderLogin.cookies.access_token, workspaceId!);
        expect(response.status).toBe(403);
    });

    it('watcher cannot create task', async () => {
        const owner = createUserPayload();
        const watcher = createUserPayload();

        await registerUser(owner);
        await registerUser(watcher);

        const ownerLogin = await loginAndGetCookies(owner);
        const watcherLogin = await loginAndGetCookies(watcher);

        const workspaceName = `workspace-${randomString()}`;
        await createWorkspace(ownerLogin.cookies.access_token, workspaceName);

        const workspaceId = await getWorkspaceIdByName(ownerLogin.cookies.access_token, workspaceName);
        expect(workspaceId).toBeDefined();

        const addWatcherResponse = await addMember(ownerLogin.cookies.access_token, workspaceId!, watcher.email, 'watcher');
        expect(addWatcherResponse.status).toBe(200);

        const response = await createTask(watcherLogin.cookies.access_token, workspaceId!);
        expect(response.status).toBe(403);
    });

    it('editor can create task', async () => {
        const owner = createUserPayload();
        const editor = createUserPayload();

        await registerUser(owner);
        await registerUser(editor);

        const ownerLogin = await loginAndGetCookies(owner);
        const editorLogin = await loginAndGetCookies(editor);

        const workspaceName = `workspace-${randomString()}`;
        await createWorkspace(ownerLogin.cookies.access_token, workspaceName);

        const workspaceId = await getWorkspaceIdByName(ownerLogin.cookies.access_token, workspaceName);
        expect(workspaceId).toBeDefined();

        const addEditorResponse = await addMember(ownerLogin.cookies.access_token, workspaceId!, editor.email, 'editor');
        expect(addEditorResponse.status).toBe(200);

        const response = await createTask(editorLogin.cookies.access_token, workspaceId!);
        expect(response.status).toBe(200);
    });

    it('task create rejects oversized title', async () => {
        const owner = createUserPayload();

        await registerUser(owner);

        const ownerLogin = await loginAndGetCookies(owner);

        const workspaceName = `workspace-${randomString()}`;
        await createWorkspace(ownerLogin.cookies.access_token, workspaceName);

        const workspaceId = await getWorkspaceIdByName(ownerLogin.cookies.access_token, workspaceName);
        expect(workspaceId).toBeDefined();

        const response = await createTask(ownerLogin.cookies.access_token, workspaceId!, {
            title: 'x'.repeat(101),
            isCompleted: false,
            deadline: '2030-01-01T10:00:00.000Z'
        });

        expect(response.status).toBe(400);
    });
});
