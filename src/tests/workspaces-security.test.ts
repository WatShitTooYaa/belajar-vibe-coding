import { describe, expect, it } from 'bun:test';
import {
    addMember,
    createUserPayload,
    createWorkspace,
    getMembers,
    getWorkspaceIdByName,
    loginAndGetCookies,
    registerUser,
    randomString,
} from './helpers';

describe('WORKSPACES API - SECURITY', () => {
    it('owner can add member', async () => {
        const owner = createUserPayload();
        const memberUser = createUserPayload();

        await registerUser(owner);
        await registerUser(memberUser);

        const ownerLogin = await loginAndGetCookies(owner);
        const ownerAccessToken = ownerLogin.cookies.access_token;

        const workspaceName = `workspace-${randomString()}`;
        const createWorkspaceResponse = await createWorkspace(ownerAccessToken, workspaceName);
        expect(createWorkspaceResponse.status).toBe(200);

        const workspaceId = await getWorkspaceIdByName(ownerAccessToken, workspaceName);
        expect(workspaceId).toBeDefined();

        const response = await addMember(ownerAccessToken, workspaceId!, memberUser.email, 'editor');
        expect(response.status).toBe(200);
    });

    it('non-member cannot view workspace members', async () => {
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

        const response = await getMembers(outsiderLogin.cookies.access_token, workspaceId!);
        expect(response.status).toBe(403);

        const body = await response.json() as { error: string };
        expect(body.error).toBeDefined();
    });

    it('non-member cannot add workspace member', async () => {
        const owner = createUserPayload();
        const outsider = createUserPayload();
        const target = createUserPayload();

        await registerUser(owner);
        await registerUser(outsider);
        await registerUser(target);

        const ownerLogin = await loginAndGetCookies(owner);
        const outsiderLogin = await loginAndGetCookies(outsider);

        const workspaceName = `workspace-${randomString()}`;
        await createWorkspace(ownerLogin.cookies.access_token, workspaceName);

        const workspaceId = await getWorkspaceIdByName(ownerLogin.cookies.access_token, workspaceName);
        expect(workspaceId).toBeDefined();

        const response = await addMember(outsiderLogin.cookies.access_token, workspaceId!, target.email, 'editor');
        expect(response.status).toBe(403);
    });

    it('watcher cannot add workspace member', async () => {
        const owner = createUserPayload();
        const watcher = createUserPayload();
        const target = createUserPayload();

        await registerUser(owner);
        await registerUser(watcher);
        await registerUser(target);

        const ownerLogin = await loginAndGetCookies(owner);
        const watcherLogin = await loginAndGetCookies(watcher);

        const workspaceName = `workspace-${randomString()}`;
        await createWorkspace(ownerLogin.cookies.access_token, workspaceName);

        const workspaceId = await getWorkspaceIdByName(ownerLogin.cookies.access_token, workspaceName);
        expect(workspaceId).toBeDefined();

        const addWatcherResponse = await addMember(ownerLogin.cookies.access_token, workspaceId!, watcher.email, 'watcher');
        expect(addWatcherResponse.status).toBe(200);

        const response = await addMember(watcherLogin.cookies.access_token, workspaceId!, target.email, 'editor');
        expect(response.status).toBe(403);
    });
});
