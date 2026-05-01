import { Elysia, NotFoundError, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { getTasksByUserId, createTask, getTaskById, updateTask, deleteTask } from '../services/tasks-service';

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('JWT_SECRET is not set');
export const tasksRoutes = new Elysia({ prefix: '/api/v1/tasks' })
    .use(
        jwt({
            name: 'jwt',
            secret: secret,
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
                if (error.name === 'NotFoundError') {
                    set.status = 404;
                    return { error: error.message };
                }
                set.status = 500;
                return { error: "Internal Server Error" };
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
                deadline: t.String({ format: 'date-time' })
            })
        })
        .get('/:id', async ({ params: { id }, userId, set }) => {
            try {
                const data = await getTaskById(id, userId);
                return { data };
            } catch (error: any) {
                if (error.name === 'NotFoundError') {
                    set.status = 404;
                    return { error: error.message };
                }
                set.status = 500;
                return { error: "Internal Server Error" };
            }
        }, {
            params: t.Object({
                id: t.Numeric()
            })
        })
        .patch('/:id', async ({ params: { id }, body, userId, set }) => {
            try {
                if (Object.keys(body).length === 0) {
                    throw new Error('No fields to update');
                }
                await updateTask(id, userId, body);
                return { data: 'ok' };
            } catch (error: any) {
                if (error instanceof NotFoundError || error.name === 'NotFoundError') {
                    set.status = 404;
                    return { error: error.message };
                }
                set.status = 500;
                return { error: "Internal Server Error" };
            }
        }, {
            params: t.Object({
                id: t.Numeric()
            }),
            body: t.Object({
                title: t.Optional(t.String()),
                isCompleted: t.Optional(t.Boolean()),
                deadline: t.Optional(t.String({ format: 'date-time' }))
            })
        })
        .delete('/:id', async ({ params: { id }, userId, set }) => {
            try {
                await deleteTask(id, userId);
                return { data: 'ok' };
            } catch (error: any) {
                if (error instanceof NotFoundError || error.name === 'NotFoundError') {
                    set.status = 404;
                    return { error: error.message };
                }
                set.status = 500;
                return { error: "Internal Server Error" };
            }
        }, {
            params: t.Object({
                id: t.Numeric()
            })
        })
    );
