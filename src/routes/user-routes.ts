import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { registerUser, loginUser, createRefreshToken, findRefreshToken, deleteRefreshToken, getCurrentUser } from '../services/user-service';
import { env } from '../config/env';
import { authCookieOptions, sessionIndicatorCookieOptions } from '../utils/cookies';

export const userRoutes = new Elysia({ prefix: '/api/auth' })
    .use(
        jwt({
            name: 'jwt',
            secret: env.jwtSecret,
        })
    )
    .post('/register', async ({ body, set }) => {
        try {
            await registerUser(body);
            return { data: 'ok' };
        } catch (error: any) {
            if (error.message === 'Email or username already exists') {
                set.status = 400;
                return { error: error.message };
            }
            console.error(error);
            set.status = 500;
            return { error: 'Internal Server Error' };
        }
    }, {
        body: t.Object({
            email: t.String({ format: 'email' }),
            username: t.String({ minLength: 8, maxLength: 255 }),
            password: t.String({ minLength: 8, maxLength: 255 })
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
                maxAge: 900,
                ...authCookieOptions
            });
            cookie.refresh_token?.set({
                value: refreshToken,
                maxAge: 604800,
                ...authCookieOptions
            });

            cookie.has_session?.set({
                value: 1,
                maxAge: 604800,
                ...sessionIndicatorCookieOptions
            });

            return { data: { user } };
        } catch (error: any) {
            if (error.message === 'Invalid email or password') {
                set.status = 401;
                return { error: error.message };
            }
            console.error(error);
            set.status = 500;
            return { error: 'Internal Server Error' };
        }
    }, {
        body: t.Object({
            email: t.String({ format: 'email', maxLength: 255, minLength: 8 }),
            password: t.String({ maxLength: 255, minLength: 8 })
        })
    })
    // Route yang tidak butuh access_token tapi butuh refresh_token
    .post('/refresh', async ({ cookie, jwt, set }) => {
        try {
            const refreshToken = cookie.refresh_token?.value as string | null;

            if (!refreshToken) {
                set.status = 401;
                return { error: 'Unauthorized' };
            }

            const refreshTokenDB = await findRefreshToken(refreshToken);

            if (!refreshTokenDB) {
                set.status = 401;
                return { error: 'Unauthorized' };
            }

            const accessToken = await jwt.sign({
                sub: refreshTokenDB.userId.toString(),
            });

            cookie.access_token?.set({
                value: accessToken,
                maxAge: 60 * 15,
                ...authCookieOptions
            });

            const currentUser = await getCurrentUser(refreshTokenDB.userId);
            return { data: { user: currentUser } };
        } catch (error: any) {
            console.error(error);
            set.status = 500;
            return { error: 'Internal Server Error' };
        }
    })
    // Logout diletakkan di luar guard agar tetap bisa logout meski access_token expired
    .delete('/logout', async ({ cookie, set }) => {
        try {
            const refreshToken = cookie.refresh_token?.value as string || null;
            if (refreshToken) {
                await deleteRefreshToken(refreshToken);
            }

            cookie.access_token?.remove();
            cookie.refresh_token?.remove();
            cookie.has_session?.remove();

            return { data: 'ok' };
        } catch (error: any) {
            console.error(error);
            set.status = 500;
            return { error: 'Internal Server Error' };
        }
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
