import { NotFoundError } from 'elysia';
import { db } from '../db';
import { tasks, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';

interface CreateTaskPayload {
    title: string;
    isCompleted: boolean;
    deadline: string;
}

interface UpdateTaskPayload extends Partial<CreateTaskPayload> { }
type UpdateTaskData = Partial<typeof tasks.$inferInsert>;


export const getTasksByWorkspaceId = async (workspaceId: number, limit = 10, offset = 0) => {
    const results = await db.select({
        id: tasks.id,
        workspaceId: tasks.workspaceId,
        createdBy: users.username, // Returning username instead of ID
        title: tasks.title,
        isCompleted: tasks.isCompleted,
        deadline: tasks.deadline,
        createdAt: tasks.createdAt
    })
    .from(tasks)
    .innerJoin(users, eq(tasks.createdBy, users.id))
    .where(eq(tasks.workspaceId, workspaceId))
    .limit(limit)
    .offset(offset);

    return results;
};


export const createTask = async (payload: CreateTaskPayload, workspaceId: number, userId: number) => {
    const dateObj = new Date(payload.deadline);
    if (isNaN(dateObj.getTime())) {
        throw new Error("Invalid deadline format");
    }
    await db.insert(tasks).values({
        workspaceId,
        createdBy: userId,
        title: payload.title,
        isCompleted: payload.isCompleted,
        deadline: dateObj,
    });
};

export const getTaskById = async (id: number, workspaceId: number) => {
    const [task] = await db.select({
        id: tasks.id,
        workspaceId: tasks.workspaceId,
        createdBy: users.username, // Returning username instead of ID
        title: tasks.title,
        isCompleted: tasks.isCompleted,
        deadline: tasks.deadline,
        createdAt: tasks.createdAt
    })
    .from(tasks)
    .innerJoin(users, eq(tasks.createdBy, users.id))
    .where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)));

    if (!task) throw new NotFoundError('Task not found');
    return task;
};

export const updateTask = async (id: number, workspaceId: number, payload: UpdateTaskPayload) => {
    const data: UpdateTaskData = {};
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
        .where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)))
        .returning();

    if (result.length === 0) throw new NotFoundError('Task not found or unauthorized');
};

export const deleteTask = async (id: number, workspaceId: number) => {
    const result = await db.delete(tasks)
        .where(and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId)))
        .returning();

    if (result.length === 0) throw new NotFoundError('Task not found or unauthorized');
};
