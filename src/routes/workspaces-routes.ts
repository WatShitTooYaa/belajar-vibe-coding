import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { createWorkspace } from '../services/workspaces-service';

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('JWT_SECRET is not set');

export const workspacesRoutes = new Elysia({ prefix: '/api/v1/workspaces' })
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
        .post('/', async ({ body, userId, set }) => {
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
    );
