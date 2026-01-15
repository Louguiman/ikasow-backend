import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { SanitizationPipe } from './pipes/sanitization.pipe';

describe('Security Measures', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            name: 'short',
            ttl: 1000,
            limit: 10,
          },
        ]),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Input Sanitization', () => {
    it('should sanitize HTML tags from input', () => {
      const pipe = new SanitizationPipe();
      const input = '<script>alert("XSS")</script>Hello World';
      const result = pipe.transform(input, {} as any);

      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
      expect(result).toContain('Hello World');
    });

    it('should escape special characters', () => {
      const pipe = new SanitizationPipe();
      const input = '<div>Test & "quotes"</div>';
      const result = pipe.transform(input, {} as any);

      expect(result).toContain('&amp;');
      expect(result).toContain('&quot;');
      expect(result).not.toContain('<div>');
    });

    it('should handle null and undefined values', () => {
      const pipe = new SanitizationPipe();

      expect(pipe.transform(null, {} as any)).toBeNull();
      expect(pipe.transform(undefined, {} as any)).toBeUndefined();
    });

    it('should sanitize nested objects', () => {
      const pipe = new SanitizationPipe();
      const input = {
        name: '<script>alert("XSS")</script>John',
        message: 'Hello <b>World</b>',
      };
      const result = pipe.transform(input, {} as any);

      expect(result.name).not.toContain('<script>');
      expect(result.message).not.toContain('<b>');
    });

    it('should sanitize arrays', () => {
      const pipe = new SanitizationPipe();
      const input = ['<script>test</script>', 'normal text'];
      const result = pipe.transform(input, {} as any);

      expect(result[0]).not.toContain('<script>');
      expect(result[1]).toBe('normal text');
    });
  });

  describe('Rate Limiting Configuration', () => {
    it('should have throttler module configured', () => {
      const throttlerModule = app.get(ThrottlerModule);
      expect(throttlerModule).toBeDefined();
    });
  });
});
