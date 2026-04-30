
import { db } from '../db';
import { users, refreshTokens } from '../db/schema';
import { eq } from 'drizzle-orm';
interface RegisterPayload {
    email: string;
    username: string;
    password: string;
}

interface LoginPayload {
    email: string;
    password: string;
}


export const registerUser = async (payload: RegisterPayload) => {
    const { email, username, password } = payload;

    const existingUser = await db.query.users.findFirst({
        where: (u, { or, eq }) =>
            or(eq(u.email, email), eq(u.username, username)),
    });

    if (existingUser) {
        throw new Error('Email or username already exists');
    }

    const hashedPassword = await Bun.password.hash(password, {
        algorithm: 'bcrypt',
        cost: 10,
    });

    await db.insert(users).values({
        email,
        username,
        password: hashedPassword,
    });

    return { success: true };
};

export const loginUser = async (payload: LoginPayload) => {
    const user = await db.query.users.findFirst({
        where: eq(users.email, payload.email),
    });

    if (!user) throw new Error('Invalid email or password');

    const valid = await Bun.password.verify(payload.password, user.password);
    if (!valid) throw new Error('Invalid email or password');

    return {
        id: user.id,
        email: user.email,
    };
};

export const createRefreshToken = async (userId: number, token: string) => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 hari

    await db.insert(refreshTokens).values({
        userId,
        token,
        expiresAt,
    });
};

export const findRefreshToken = async (token: string) => {
    const result = await db.query.refreshTokens.findFirst({
        where: eq(refreshTokens.token, token),
    });

    if (!result) return null;

    if (new Date(result.expiresAt) < new Date()) {
        return null;
    }

    return result;
};

export const deleteRefreshToken = async (token: string) => {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
};

export const getCurrentUser = async (userId: number) => {
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
            id: true,
            email: true,
            username: true,
        },
    });

    if (!user) throw new Error('Unauthorized');

    return user;
};