import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { registerUser, loginUser, createSession } from '../services/user-service';

export const userRoutes = new Elysia({ prefix: '/api/auth' })
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'secret',
    })
  )
  .post('/register', async ({ body, set }) => {
    try {
      await registerUser(body);
      return { data: 'ok' };
    } catch (error: any) {
      set.status = 400;
      return { error: error.message };
    }
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      username: t.String({ minLength: 3 }),
      password: t.String({ minLength: 6 })
    })
  })
  .post('/login', async ({ body, set, jwt }) => {
    try {
      const user = await loginUser(body);
      
      // Generate JWT Token
      const token = await jwt.sign({
        sub: user.id.toString(),
      });

      // Save Session
      await createSession(user.id, token);

      return { data: token };
    } catch (error: any) {
      set.status = 401;
      return { error: error.message };
    }
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String()
    })
  });
