import { db } from '../db';
import { workspaces, workspaceMembers } from '../db/schema';

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
