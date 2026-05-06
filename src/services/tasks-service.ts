import { NotFoundError } from 'elysia';
import { db } from '../db';
import { tasks } from '../db/schema';
import { eq, and } from 'drizzle-orm';

interface CreateTaskPayload {
    title: string;
    isCompleted: boolean;
    deadline: string;
}

interface UpdateTaskPayload extends Partial<CreateTaskPayload> { }
type UpdateTaskData = Partial<typeof tasks.$inferInsert>;


export const getTasksByUserId = async (userId: number, limit = 10, offset = 0) => {
    return await db.query.tasks.findMany({
        where: eq(tasks.userId, userId),
        limit,
        offset
    });
};

export const createTask = async (payload: CreateTaskPayload, userId: number) => {
    const dateObj = new Date(payload.deadline);
    if (isNaN(dateObj.getTime())) {
        throw new Error("Invalid deadline format");
    }
    await db.insert(tasks).values({
        userId,
        title: payload.title,
        isCompleted: payload.isCompleted,
        deadline: dateObj,
    });
};

export const getTaskById = async (id: number, userId: number) => {
    const task = await db.query.tasks.findFirst({
        where: and(eq(tasks.id, id), eq(tasks.userId, userId)),
    });

    if (!task) throw new NotFoundError('Task not found');
    return task;
};

export const updateTask = async (id: number, userId: number, payload: UpdateTaskPayload) => {
    const data: UpdateTaskData = {};
    // const data: any = { ...payload };
    if (payload.title !== undefined) data.title = payload.title;
    if (payload.isCompleted !== undefined) data.isCompleted = payload.isCompleted;
    if (payload.deadline !== undefined) {
        const dateObj = new Date(payload.deadline);
        if (isNaN(dateObj.getTime())) {
            throw new Error("Invalid deadline format");
        }
        data.deadline = dateObj;
    }

    const result = await db.update(tasks)
        .set(data)
        .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
        .returning();

    if (result.length === 0) throw new NotFoundError('Task not found or unauthorized');
};

export const deleteTask = async (id: number, userId: number) => {
    const result = await db.delete(tasks)
        .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
        .returning();

    if (result.length === 0) throw new NotFoundError('Task not found or unauthorized');
};
