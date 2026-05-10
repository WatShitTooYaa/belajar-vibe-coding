import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { createWorkspace, getWorkspacesByUserId } from '../services/workspaces-service';
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
    .get('', async ({ userId, set }) => {
        try {
            const data = await getWorkspacesByUserId(userId);
            return { data };
        } catch (error: any) {
            set.status = 500;
            return { error: error.message };
        }
    })
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
    .use(tasksRoutes);
