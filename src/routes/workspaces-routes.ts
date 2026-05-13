import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { createWorkspace, getWorkspacesByUserId, addWorkspaceMember, getWorkspaceMembers, getWorkspacesByMemberId } from '../services/workspaces-service';
import { tasksRoutes } from './tasks-routes';

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('JWT_SECRET is not set');

export const workspacesRoutes = new Elysia({ prefix: '/api/v1/workspaces' })
    .use(
        jwt({
            name: 'jwt',
            secret: secret,
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
            set.status = 500;
            return { error: error.message };
        }
    })
    // create workspace
    .post('', async ({ body, userId, set }) => {
        try {
            const data = await createWorkspace(body.name, userId);
            return { data };
        } catch (error: any) {
            set.status = 500;
            return { error: error.message };
        }
    }, {
        body: t.Object({
            name: t.String({ minLength: 1, maxLength: 50 }),
        })
    })
    // add member
    .post('/:workspaceId/members', async ({ params: { workspaceId }, body, set }) => {
        try {
            const data = await addWorkspaceMember(workspaceId, body.email, body.role);
            return { data };
        } catch (error: any) {
            if (error.message === "User not found") {
                set.status = 404;
            } else {
                set.status = 400;
            }
            return { error: error.message };
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
    .get('/:workspaceId/members', async ({ params: { workspaceId }, set }) => {
        try {
            const data = await getWorkspaceMembers(workspaceId);
            return { data };
        } catch (error: any) {
            if (error.message === "Workspace not found") {
                set.status = 404;
            } else {
                set.status = 400;
            }
            return { error: error.message };
        }
    }, {
        params: t.Object({
            workspaceId: t.Numeric()
        })
    })
    .use(tasksRoutes);
