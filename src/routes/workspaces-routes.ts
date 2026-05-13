import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { createWorkspace, getWorkspacesByUserId, addWorkspaceMember, getWorkspaceMembers, getWorkspacesByMemberId, getWorkspaceMember } from '../services/workspaces-service';
import { tasksRoutes } from './tasks-routes';
import { env } from '../config/env';

export const workspacesRoutes = new Elysia({ prefix: '/api/v1/workspaces' })
    .use(
        jwt({
            name: 'jwt',
            secret: env.jwtSecret,
        })
    )
    .derive(async ({ cookie: { access_token }, jwt, set }) => {
        const accessToken = access_token?.value as string | null;

        if (!accessToken) {
            set.status = 401;
            throw new Error('Unauthorized');
        }

        const payload = await jwt.verify(accessToken);

        if (!payload) {
            set.status = 401;
            throw new Error('Unauthorized');
        }

        return {
            userId: Number(payload.sub),
        };
    })
    // get all workspaces
    .get('', async ({ userId, set }) => {
        try {
            const data = await getWorkspacesByMemberId(userId);
            return { data };
        } catch (error: any) {
            console.error(error);
            set.status = 500;
            return { error: 'Internal Server Error' };
        }
    })
    // create workspace
    .post('', async ({ body, userId, set }) => {
        try {
            const data = await createWorkspace(body.name, userId);
            return { data };
        } catch (error: any) {
            console.error(error);
            set.status = 500;
            return { error: 'Internal Server Error' };
        }
    }, {
        body: t.Object({
            name: t.String({ minLength: 1, maxLength: 50 }),
        })
    })
    // add member
    .post('/:workspaceId/members', async ({ params: { workspaceId }, body, userId, set }) => {
        try {
            const member = await getWorkspaceMember(workspaceId, userId);

            if (!member) {
                set.status = 403;
                return { error: 'Forbidden' };
            }

            if (member.role !== 'owner') {
                set.status = 403;
                return { error: 'Forbidden' };
            }

            const data = await addWorkspaceMember(workspaceId, body.email, body.role);
            return { data };
        } catch (error: any) {
            if (error.message === "User not found") {
                set.status = 404;
                return { error: error.message };
            } else if (error.message === "User is already a member of this workspace") {
                set.status = 400;
                return { error: error.message };
            }
            console.error(error);
            set.status = 500;
            return { error: 'Internal Server Error' };
        }
    }, {
        params: t.Object({
            workspaceId: t.Numeric()
        }),
        body: t.Object({
            email: t.String({ format: 'email' }),
            role: t.Union([t.Literal('editor'), t.Literal('watcher')])
        })
    })
    .get('/:workspaceId/members', async ({ params: { workspaceId }, userId, set }) => {
        try {
            const member = await getWorkspaceMember(workspaceId, userId);

            if (!member) {
                set.status = 403;
                return { error: 'Forbidden' };
            }

            const data = await getWorkspaceMembers(workspaceId);
            return { data };
        } catch (error: any) {
            console.error(error);
            set.status = 500;
            return { error: 'Internal Server Error' };
        }
    }, {
        params: t.Object({
            workspaceId: t.Numeric()
        })
    })
    .use(tasksRoutes);
