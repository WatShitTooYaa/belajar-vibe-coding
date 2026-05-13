import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { jwt } from '@elysiajs/jwt';
import { userRoutes } from './routes/user-routes';
import { workspacesRoutes } from './routes/workspaces-routes';
import { tasksRoutes } from './routes/tasks-routes';
import { env } from './config/env';
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
    .use(cors({
        origin: env.frontendOrigin,
        credentials: true,
    }))
    .use(
        jwt({
            name: 'jwt',
            secret: env.jwtSecret,
        })
    )
    .onError(({ code, error, set }) => {
        console.error(`[Error] ${code}: ${error}`);
        if (code === 'NOT_FOUND') return { error: 'Not Found' };
        if (code === 'VALIDATION') return { error: 'Bad Request' };
        set.status = 500;
        return { error: 'Internal Server Error' };
    })
    .get('/', () => 'Server is running!')
    .use(userRoutes)
    .use(workspacesRoutes)
    .use(tasksRoutes);

if (import.meta.main) {
    app.listen(3000);
    console.log(
        `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
    );
}
