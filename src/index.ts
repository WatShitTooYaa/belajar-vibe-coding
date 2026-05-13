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
        if (code === 'NOT_FOUND') {
            set.status = 404;
            return { error: 'Not Found' };
        }
        if (code === 'VALIDATION') {
            set.status = 400;
            return { error: 'Bad Request' };
        }

        const currentStatus = Number(set.status ?? 500);
        if (currentStatus === 401) return { error: 'Unauthorized' };
        if (currentStatus === 403) return { error: 'Forbidden' };
        if (currentStatus === 404) return { error: 'Not Found' };
        if (currentStatus >= 400 && currentStatus < 500) {
            return { error: 'Bad Request' };
        }

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
