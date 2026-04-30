import { db } from '../db';
import { tasks } from '../db/schema';
import { eq } from 'drizzle-orm';

interface CreateTaskPayload {
    title: string;
    isCompleted: boolean;
    deadline: string;
}

export const getTasksByUserId = async (userId: number) => {
    return await db.query.tasks.findMany({
        where: eq(tasks.userId, userId),
    });
};

export const createTask = async (payload: CreateTaskPayload, userId: number) => {
    await db.insert(tasks).values({
        userId,
        title: payload.title,
        isCompleted: payload.isCompleted,
        deadline: new Date(payload.deadline),
    });
};
