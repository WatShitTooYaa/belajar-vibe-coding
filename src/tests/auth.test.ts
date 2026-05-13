import { describe, expect, it } from 'bun:test';
import { app } from '../index';

const randomString = () => Math.random().toString(36).substring(7);

let accessToken = '';
let refreshToken = '';

const testUser = {
    email: `test-${randomString()}@example.com`,
    username: `user-${randomString()}`,
    password: 'password123'
};

const parseCookies = (setCookie: string[]) => {
    const cookies: Record<string, string> = {};
    for (const c of setCookie) {
        const [pair] = c.split(';');
        if (!pair) continue;
        const [key, value] = pair.split('=');
        if (!key || !value) continue;
        cookies[key] = value;
    }
    return cookies;
};

describe('AUTH API - PRODUCTION GRADE', () => {


    // =========================
    // REGISTER
    // =========================
    describe('POST /api/auth/register', () => {

        it('HP-01 should register successfully', async () => {
            const res = await app.handle(new Request('http://localhost/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testUser)
            }));

            expect(res.status).toBe(200);
            const body = await res.json() as any;
            expect(body.data).toBeDefined();
        });

        it('VAL-01 should fail duplicate email', async () => {
            const res = await app.handle(new Request('http://localhost/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...testUser, username: 'another' })
            }));

            expect(res.status).toBe(400);
        });

        it('VAL-02 should fail invalid email format', async () => {
            const res = await app.handle(new Request('http://localhost/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'invalid-email',
                    username: 'user123',
                    password: 'password123'
                })
            }));

            expect(res.status).toBe(400);
        });

        it('VAL-03 should fail short password', async () => {
            const res = await app.handle(new Request('http://localhost/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'valid@mail.com',
                    username: 'user123',
                    password: '123'
                })
            }));

            expect(res.status).toBe(400);
        });

        it('SEC-01 should fail missing fields', async () => {
            const res = await app.handle(new Request('http://localhost/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            }));

            expect(res.status).toBeGreaterThanOrEqual(400);
        });

    });

    // =========================
    // LOGIN
    // =========================
    describe('POST /api/auth/login', () => {

        it('HP-01 should login and set cookies', async () => {
            const res = await app.handle(new Request('http://localhost/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: testUser.email,
                    password: testUser.password
                })
            }));

            expect(res.status).toBe(200);

            const setCookie = res.headers.getSetCookie();
            const cookies = parseCookies(setCookie);

            expect(cookies.access_token).toBeDefined();
            expect(cookies.refresh_token).toBeDefined();

            accessToken = cookies.access_token as string;
            refreshToken = cookies.refresh_token as string;
        });

        it('VAL-01 should fail wrong password', async () => {
            const res = await app.handle(new Request('http://localhost/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: testUser.email,
                    password: 'wrongpassword'
                })
            }));

            expect(res.status).toBe(401);
        });

        it('SEC-01 should not expose internal error', async () => {
            const res = await app.handle(new Request('http://localhost/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'notfound@mail.com',
                    password: 'whatever'
                })
            }));

            const body = await res.json() as any;
            expect(body.error).toBeDefined();
        });

    });

    // =========================
    // ME
    // =========================
    describe('GET /api/auth/me', () => {

        it('HP-01 should return current user', async () => {
            const res = await app.handle(new Request('http://localhost/api/auth/me', {
                method: 'GET',
                headers: {
                    Cookie: `access_token=${accessToken}`
                }
            }));

            expect(res.status).toBe(200);
        });

        it('SEC-01 should fail without token', async () => {
            const res = await app.handle(new Request('http://localhost/api/auth/me', {
                method: 'GET'
            }));

            expect(res.status).toBe(401);
        });

        it('SEC-02 should fail with tampered token', async () => {
            const res = await app.handle(new Request('http://localhost/api/auth/me', {
                method: 'GET',
                headers: {
                    Cookie: `access_token=${accessToken}tampered`
                }
            }));

            expect(res.status).toBe(401);
        });

    });

    // =========================
    // REFRESH
    // =========================
    describe('POST /api/auth/refresh', () => {

        it('HP-01 should refresh access token', async () => {
            const res = await app.handle(new Request('http://localhost/api/auth/refresh', {
                method: 'POST',
                headers: {
                    Cookie: `refresh_token=${refreshToken}`
                }
            }));

            expect(res.status).toBe(200);

            const setCookie = res.headers.getSetCookie();
            const cookies = parseCookies(setCookie);

            expect(cookies.access_token).toBeDefined();
        });

        it('SEC-01 should fail without refresh token', async () => {
            const res = await app.handle(new Request('http://localhost/api/auth/refresh', {
                method: 'POST'
            }));

            expect(res.status).toBe(401);
        });

        it('SEC-02 should fail invalid refresh token', async () => {
            const res = await app.handle(new Request('http://localhost/api/auth/refresh', {
                method: 'POST',
                headers: {
                    Cookie: `refresh_token=invalid_token`
                }
            }));

            expect(res.status).toBe(401);
        });

    });

    // =========================
    // LOGOUT
    // =========================
    describe('DELETE /api/auth/logout', () => {

        it('HP-01 should logout and clear cookies', async () => {
            const res = await app.handle(new Request('http://localhost/api/auth/logout', {
                method: 'DELETE',
                headers: {
                    Cookie: `refresh_token=${refreshToken}`
                }
            }));

            expect(res.status).toBe(200);

            const setCookie = res.headers.getSetCookie();
            expect(setCookie.some(c => c.includes('Max-Age=0'))).toBe(true);
        });

        it('SEC-01 should not allow refresh after logout', async () => {
            const res = await app.handle(new Request('http://localhost/api/auth/refresh', {
                method: 'POST',
                headers: {
                    Cookie: `refresh_token=${refreshToken}`
                }
            }));

            expect(res.status).toBe(401);
        });

    });


});
