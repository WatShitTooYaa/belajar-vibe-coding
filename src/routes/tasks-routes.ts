import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { getTasksByUserId, createTask, getTaskById, updateTask, deleteTask } from '../services/tasks-service';

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
        .get('/:id', async ({ params: { id }, userId, set }) => {
            try {
                const data = await getTaskById(id, userId);
                return { data };
            } catch (error: any) {
                set.status = error.message === 'Task not found' ? 404 : 500;
                return { error: error.message };
            }
        }, {
            params: t.Object({
                id: t.Numeric()
            })
        })
        .patch('/:id', async ({ params: { id }, body, userId, set }) => {
            try {
                await updateTask(id, userId, body);
                return { data: 'ok' };
            } catch (error: any) {
                set.status = error.message.includes('not found') ? 404 : 500;
                return { error: error.message };
            }
        }, {
            params: t.Object({
                id: t.Numeric()
            }),
            body: t.Object({
                title: t.Optional(t.String()),
                isCompleted: t.Optional(t.Boolean()),
                deadline: t.Optional(t.String())
            })
        })
        .delete('/:id', async ({ params: { id }, userId, set }) => {
            try {
                await deleteTask(id, userId);
                return { data: 'ok' };
            } catch (error: any) {
                set.status = error.message.includes('not found') ? 404 : 500;
                return { error: error.message };
            }
        }, {
            params: t.Object({
                id: t.Numeric()
            })
        })
    );
