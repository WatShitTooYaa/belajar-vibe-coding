import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { userRoutes } from './routes/user-routes';

const app = new Elysia()
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'secret',
    })
  )
  .get('/', () => 'Server is running!')
  .use(userRoutes)
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
