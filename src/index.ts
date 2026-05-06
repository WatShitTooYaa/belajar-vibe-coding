import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { jwt } from '@elysiajs/jwt';
import { userRoutes } from './routes/user-routes';
import { tasksRoutes } from './routes/tasks-routes';

export const app = new Elysia()
  .use(cors())
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'secret',
    })
  )
  .get('/', () => 'Server is running!')
  .use(userRoutes)
  .use(tasksRoutes);

if (import.meta.main) {
  app.listen(3000);
  console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
  );
}
