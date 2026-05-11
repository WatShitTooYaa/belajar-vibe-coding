import { NotFoundError } from 'elysia';
import { db } from '../db';
import { workspaces, workspaceMembers, users } from '../db/schema';
import { and, eq } from 'drizzle-orm';

export const addWorkspaceMember = async (workspaceId: number, email: string, role: 'editor' | 'watcher') => {
    // 1. Find user by email
    const user = await db.query.users.findFirst({
        where: eq(users.email, email)
    });

    if (!user) {
        throw new Error("User not found");
    }

    // 2. Check if user is already a member
    const existingMember = await db.query.workspaceMembers.findFirst({
        where: and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, user.id)
        )
    });

    if (existingMember) {
        throw new Error("User is already a member of this workspace");
    }

    // 3. Insert new member
    await db.insert(workspaceMembers).values({
        workspaceId,
        userId: user.id,
        role
    });

    return "ok";
};

export const getWorkspaceMembers = async (workspaceId: number) => {
    const members = await db.query.workspaceMembers.findMany({
        where: eq(workspaceMembers.workspaceId, workspaceId)
    });
    return members;
};

interface UpdateWorkspacePayload {
    name?: string;
    isCompleted?: boolean;
    deadline?: string;
}

type UpdateWorkspaceData = Partial<typeof workspaces.$inferInsert>;

export const getWorkspaceMember = async (workspaceId: number, userId: number) => {
    const member = await db.query.workspaceMembers.findFirst({
        where: and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, userId)
        )
    });
    return member;
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