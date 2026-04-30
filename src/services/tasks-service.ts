import { db } from '../db';
import { tasks } from '../db/schema';
import { eq, and } from 'drizzle-orm';

interface CreateTaskPayload {
    title: string;
    isCompleted: boolean;
    deadline: string;
}

interface UpdateTaskPayload extends Partial<CreateTaskPayload> {}

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

export const getTaskById = async (id: number, userId: number) => {
    const task = await db.query.tasks.findFirst({
        where: and(eq(tasks.id, id), eq(tasks.userId, userId)),
    });

    if (!task) throw new Error('Task not found');
    return task;
};

export const updateTask = async (id: number, userId: number, payload: UpdateTaskPayload) => {
    const data: any = { ...payload };
    if (payload.deadline) data.deadline = new Date(payload.deadline);

    const result = await db.update(tasks)
        .set(data)
        .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));

    // @ts-ignore
    if (result[0].affectedRows === 0) throw new Error('Task not found or unauthorized');
};

export const deleteTask = async (id: number, userId: number) => {
    const result = await db.delete(tasks)
        .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));

    // @ts-ignore
    if (result[0].affectedRows === 0) throw new Error('Task not found or unauthorized');
};
