import { env } from '../config/env';

export const authCookieOptions = {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    path: '/',
    sameSite: 'strict' as const,
};

export const sessionIndicatorCookieOptions = {
    httpOnly: false,
    secure: env.nodeEnv === 'production',
    path: '/',
    sameSite: 'strict' as const,
};
