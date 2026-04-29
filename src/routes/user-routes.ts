import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { registerUser, loginUser, createSession, getCurrentUser, logoutUser } from '../services/user-service';

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
  })
  .get('/me', async ({ headers, set }) => {
    try {
      const authHeader = headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Unauthorized');
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        throw new Error('Unauthorized');
      }
      const user = await getCurrentUser(token);

      return { data: user };
    } catch (error: any) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }
  })
  .delete('/logout', async ({ headers, set }) => {
    try {
      const authHeader = headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('token tidak ada');
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        throw new Error('token tidak ada');
      }

      const [result] = await logoutUser(token);
      if (result.affectedRows === 0) {
        throw new Error('token tidak ada');
      }

      return { data: 'ok' };
    } catch (error: any) {
      set.status = 401;
      return { error: 'token tidak ada' };
    }
  });
