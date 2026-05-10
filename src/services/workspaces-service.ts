import { NotFoundError } from 'elysia';
import { db } from '../db';
import { workspaces, workspaceMembers } from '../db/schema';
import { and, eq } from 'drizzle-orm';

interface UpdateWorkspacePayload {
    name?: string;
    isCompleted?: boolean;
    deadline?: string;
}

type UpdateWorkspaceData = Partial<typeof workspaces.$inferInsert>;

export const checkWorkspaceMember = async (workspaceId: number, userId: number) => {
    const member = await db.query.workspaceMembers.findFirst({
        where: and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, userId)
        )
    });
    return !!member;
};

//check all user can access workspace
export const getWorkspacesByUserId = async (userId: number, limit = 10, offset = 0) => {
    const results = await db.query.workspaces.findMany({
        where: eq(workspaces.createdBy, userId),
        limit,
        offset
    });

    return results;
};

export const createWorkspace = async (name: string, userId: number) => {
    try {
        return await db.transaction(async (tx) => {
            const [newWorkspace] = await tx.insert(workspaces).values({
                name,
                createdBy: userId,
            }).returning();

            if (!newWorkspace) {
                throw new Error('Failed to create workspace');
            }

            await tx.insert(workspaceMembers).values({
                workspaceId: newWorkspace.id,
                userId: userId,
                role: 'owner',
            });

            return "ok";
        });
    } catch (error) {
        console.error('Error creating workspace:', error);
        throw error;
    }
};

export const updateWorkspace = async (workspaceId: number, userId: number, payload: UpdateWorkspacePayload) => {
    const data: UpdateWorkspaceData = {};
    if (payload.name !== undefined) data.name = payload.name;
    const result = await db.update(workspaces)
        .set(data)
        .where(and(eq(workspaces.id, workspaceId), eq(workspaces.createdBy, userId)))
        .returning();

    if (result.length === 0) throw new NotFoundError('Workspace not found or unauthorized');
};

export const deleteWorkspace = async (workspaceId: number, userId: number) => {
    const result = await db.delete(workspaces)
        .where(and(eq(workspaces.id, workspaceId), eq(workspaces.createdBy, userId)))
        .returning();

    if (result.length === 0) throw new NotFoundError('Workspace not found or unauthorized');
};