import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { getTasksByUserId, createTask } from '../services/tasks-service';

export const tasksRoutes = new Elysia({ prefix: '/api/v1/tasks' })
    .use(
        jwt({
            name: 'jwt',
            secret: process.env.JWT_SECRET || 'secret',
        })
    )
    .guard({}, (app) => app
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
        .get('/', async ({ userId, set }) => {
            try {
                const data = await getTasksByUserId(userId);
                return { data };
            } catch (error: any) {
                set.status = 500;
                return { error: error.message };
            }
        })
        .post('/', async ({ body, userId, set }) => {
            try {
                await createTask(body, userId);
                return { data: 'ok' };
            } catch (error: any) {
                set.status = 500;
                return { error: error.message };
            }
        }, {
            body: t.Object({
                title: t.String(),
                isCompleted: t.Boolean(),
                deadline: t.String()
            })
        })
    );
