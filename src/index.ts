import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { userRoutes } from './routes/user-routes';

export const app = new Elysia()
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'secret',
    })
  )
  .get('/', () => 'Server is running!')
  .use(userRoutes);

if (import.meta.main) {
  app.listen(3000);
  console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
  );
}
