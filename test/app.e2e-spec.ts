import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';

/**
 * A smoke test, not a unit suite: it boots the whole AppModule and drives the
 * configured `configureApp` stack (global `api` prefix, validation pipe,
 * exception filter), so a route passing here has passed the real wiring.
 *
 * `test/setup-e2e-env.ts` (a jest `setupFiles` entry) runs first and maps the
 * `DB_*` convention of the DB-backed unit specs onto the `DATABASE_*` names the
 * app validates at boot, with `DB_RESET=true: it is deliberately destructive to
 * a **throwaway** database only, and the seeder (which only runs when
 * `agencies` is empty) guarantees `admin@demo.com`. Never point these variables
 * at a database you care about. Example (matching DEV_CONTAINER.md):
 *
 *   docker run --rm --network host \
 *     -e DB_HOST=127.0.0.1 -e DB_PORT=55432 -e DB_USERNAME=postgres \
 *     -e DB_PASSWORD=postgres -e DB_NAME=ikasow_test \
 *     -v "$PWD":/app -v ikasow_be_nm:/app/node_modules -w /app node:20 \
 *     npm run test:e2e
 */
describe('API smoke test', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves the welcome message at the /api root', () => {
    return request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect('Welcome to IMMOMALI Backend API');
  });

  it('reports a connected database on /api/health', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('connected');
    expect(res.body.version).toBeDefined();
  });

  it('logs the seeded admin in and reads the profile with the token', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@demo.com', password: 'password123' })
      .expect(200);

    expect(typeof login.body.access_token).toBe('string');
    expect(login.body.access_token.length).toBeGreaterThan(0);

    const profile = await request(app.getHttpServer())
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${login.body.access_token}`)
      .expect(200);

    expect(profile.body.email).toBe('admin@demo.com');
    expect(profile.body.role).toBeDefined();
  });

  it('lets the admin read a scoped list the guards are supposed to enforce', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@demo.com', password: 'password123' });

    const list = await request(app.getHttpServer())
      .get('/api/properties?page=1&limit=5')
      .set('Authorization', `Bearer ${login.body.access_token}`)
      .expect(200);

    expect(typeof list.body.total).toBe('number');
    expect(Array.isArray(list.body.data)).toBe(true);
  });

  it('rejects a body the whitelisting pipe is supposed to reject', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@demo.com',
        password: 'password123',
        role: 'platform-admin',
      })
      .expect(400);
  });
});