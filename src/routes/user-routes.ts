import { Elysia, t } from 'elysia';
import { registerUser } from '../services/user-service';

export const userRoutes = new Elysia({ prefix: '/api/auth' })
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
  });
