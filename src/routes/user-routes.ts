import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { registerUser, loginUser, createRefreshToken, findRefreshToken, deleteRefreshToken, getCurrentUser } from '../services/user-service';

export const userRoutes = new Elysia({ prefix: '/api/auth' })
    .use(
        jwt({
            name: 'jwt',
            secret: process.env.JWT_SECRET || 'secret',
        })
    )
    .post('/register', async ({ body, set }) => {
        try {
            await registerUser(body);
            return { data: 'ok' };
        } catch (error: any) {
            set.status = 400;
            return { error: error.message };
        }
    }, {
        body: t.Object({
            email: t.String({ format: 'email' }),
            username: t.String({ minLength: 3 }),
            password: t.String({ minLength: 6 })
        })
    })
    .post('/login', async ({ cookie, body, set, jwt }) => {
        try {
            const user = await loginUser(body);

            const accessToken = await jwt.sign({
                sub: user.id.toString(),
            });

            const refreshToken = crypto.randomUUID();

            await createRefreshToken(user.id, refreshToken);

            cookie.access_token?.set({
                value: accessToken,
                httpOnly: true,
                maxAge: 900,
                path: '/',
                sameSite: 'strict'
            });
            cookie.refresh_token?.set({
                value: refreshToken,
                httpOnly: true,
                maxAge: 604800, // 7 hari
                path: '/',
                sameSite: 'strict'
            });

            return { data: { user } };
        } catch (error: any) {
            set.status = error.message === 'Invalid email or password' ? 401 : 500;
            return { error: error.message };
        }
    }, {
        body: t.Object({
            email: t.String({ format: 'email', maxLength: 255, minLength: 8 }),
            password: t.String({ maxLength: 255, minLength: 8 })
        })
    })
    // Route yang tidak butuh access_token tapi butuh refresh_token
    .post('/refresh', async ({ cookie, jwt, set }) => {
        const refreshToken = cookie.refresh_token?.value as string | null;

        if (!refreshToken) {
            set.status = 401;
            throw new Error('Unauthorized');
        }

        const refreshTokenDB = await findRefreshToken(refreshToken);

        if (!refreshTokenDB) {
            set.status = 401;
            throw new Error('Unauthorized');
        }

        const accessToken = await jwt.sign({
            sub: refreshTokenDB.userId.toString(),
        });

        cookie.access_token?.set({
            value: accessToken,
            httpOnly: true,
            maxAge: 60 * 15,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            sameSite: 'strict'
        });

        const currentUser = await getCurrentUser(refreshTokenDB.userId);
        return { data: { user: currentUser } };
    })
    // Logout diletakkan di luar guard agar tetap bisa logout meski access_token expired
    .delete('/logout', async ({ cookie }) => {
        const refreshToken = cookie.refresh_token?.value as string || null;
        if (refreshToken) {
            await deleteRefreshToken(refreshToken);
        }

        cookie.access_token?.remove();
        cookie.refresh_token?.remove();

        return { data: 'ok' };
    })
    // Mengelompokkan route yang butuh otentikasi access_token (Protected Routes)
    .guard({}, (app) => app
        // Middleware pembaca dan pemvalidasi token
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
        .get('/me', async ({ userId, set }) => {
            try {
                const user = await getCurrentUser(userId);
                return { data: user };
            } catch (error: any) {
                set.status = 401;
                return { error: 'Unauthorized' };
            }
        })
    );
