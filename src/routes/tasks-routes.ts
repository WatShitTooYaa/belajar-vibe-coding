import { Elysia, NotFoundError, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { getTasksByWorkspaceId, createTask, getTaskById, updateTask, deleteTask } from '../services/tasks-service';
import { getWorkspaceMember } from '../services/workspaces-service';

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('JWT_SECRET is not set');

export const tasksRoutes = new Elysia({ prefix: '/:workspaceId/tasks' })
    .use(
        jwt({
            name: 'jwt',
            secret: secret,
        })
    )
    .derive(async ({ cookie: { access_token }, jwt, set, params }) => {
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

        const userId = Number(payload.sub);
        const workspaceId = Number((params as any).workspaceId);

        // Authorization Check
        const member = await getWorkspaceMember(workspaceId, userId);
        if (!member) {
            set.status = 403;
            throw new Error('Forbidden: Anda bukan member workspace ini');
        }

        return {
            userId,
            workspaceId,
            role: member.role
        };
    })
    .get('', async ({ workspaceId, set }) => {
        try {
            const data = await getTasksByWorkspaceId(workspaceId);
            return { data };
        } catch (error: any) {
            set.status = 500;
            return { error: error.message || "Internal Server Error" };
        }
    })
    .post('', async ({ body, workspaceId, userId, role, set }) => {
        if (role === 'watcher') {
            set.status = 403;
            return { error: "Forbidden: Watcher cannot create tasks" };
        }
        try {
            await createTask(body, workspaceId, userId);
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
    .get('/:id', async ({ params, workspaceId, set }) => {
        try {
            const id = Number((params as any).id);
            const data = await getTaskById(id, workspaceId);
            return { data };
        } catch (error: any) {
            if (error.name === 'NotFoundError' || error instanceof NotFoundError) {
                set.status = 404;
                return { error: error.message };
            }
            set.status = 500;
            return { error: "Internal Server Error" };
        }
    })
    .patch('/:id', async ({ params, body, workspaceId, role, set }) => {
        if (role === 'watcher') {
            set.status = 403;
            return { error: "Forbidden: Watcher cannot update tasks" };
        }
        try {
            const id = Number((params as any).id);
            if (Object.keys(body).length === 0) {
                throw new Error('No fields to update');
            }
            await updateTask(id, workspaceId, body);
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
        body: t.Object({
            title: t.Optional(t.String()),
            isCompleted: t.Optional(t.Boolean()),
            deadline: t.Optional(t.String({ format: 'date-time' }))
        })
    })
    .delete('/:id', async ({ params, workspaceId, role, set }) => {
        if (role === 'watcher') {
            set.status = 403;
            return { error: "Forbidden: Watcher cannot delete tasks" };
        }
        try {
            const id = Number((params as any).id);
            await deleteTask(id, workspaceId);
            return { data: 'ok' };
        } catch (error: any) {
            if (error instanceof NotFoundError || error.name === 'NotFoundError') {
                set.status = 404;
                return { error: error.message };
            }
            set.status = 500;
            return { error: "Internal Server Error" };
        }
    });
