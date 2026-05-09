import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { jwt } from '@elysiajs/jwt';
import { userRoutes } from './routes/user-routes';
import { tasksRoutes } from './routes/tasks-routes';
import { workspacesRoutes } from './routes/workspaces-routes';
import logixlysia from 'logixlysia';

export const app = new Elysia()
    .use(logixlysia({
        config: {
            service: 'api-server',
            showStartupMessage: true,
            startupMessageFormat: 'banner',
            showContextTree: true,
            contextDepth: 2,
            slowThreshold: 500,
            verySlowThreshold: 1000,
            timestamp: {
                translateTime: 'yyyy-mm-dd HH:MM:ss.SSS'
            },
            ip: true
        }
    }))
    .use(cors())
    .use(
        jwt({
            name: 'jwt',
            secret: process.env.JWT_SECRET || 'secret',
        })
    )
    .onError(({ code, error }) => {
        console.error(`[Error] ${code}: ${error}`);
    })
    .get('/', () => 'Server is running!')
    .use(userRoutes)
    .use(tasksRoutes)
    .use(workspacesRoutes);

if (import.meta.main) {
    app.listen(3000);
    console.log(
        `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
    );
}
