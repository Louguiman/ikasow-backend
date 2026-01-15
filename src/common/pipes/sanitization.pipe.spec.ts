import { SanitizationPipe } from './sanitization.pipe';

describe('SanitizationPipe', () => {
  let pipe: SanitizationPipe;

  beforeEach(() => {
    pipe = new SanitizationPipe();
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  it('should remove script tags', () => {
    const input = '<script>alert("XSS")</script>Hello';
    const result = pipe.transform(input, {} as any);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
  });

  it('should remove HTML tags', () => {
    const input = '<div>Hello <b>World</b></div>';
    const result = pipe.transform(input, {} as any);
    expect(result).not.toContain('<div>');
    expect(result).not.toContain('<b>');
    expect(result).not.toContain('</b>');
    expect(result).not.toContain('</div>');
  });

  it('should escape special characters', () => {
    const input = 'Test & "quotes" \'apostrophes\'';
    const result = pipe.transform(input, {} as any);
    expect(result).toContain('&amp;');
    expect(result).toContain('&quot;');
    expect(result).toContain('&#x27;');
  });

  it('should handle null and undefined', () => {
    expect(pipe.transform(null, {} as any)).toBeNull();
    expect(pipe.transform(undefined, {} as any)).toBeUndefined();
  });

  it('should handle non-string primitives', () => {
    expect(pipe.transform(123, {} as any)).toBe(123);
    expect(pipe.transform(true, {} as any)).toBe(true);
  });

  it('should sanitize object properties', () => {
    const input = {
      name: '<script>alert("XSS")</script>John',
      city: '<b>Bamako</b>',
    };
    const result = pipe.transform(input, {} as any);
    expect(result.name).not.toContain('<script>');
    expect(result.city).not.toContain('<b>');
  });

  it('should sanitize array elements', () => {
    const input = ['<script>test</script>', '<div>Hello</div>'];
    const result = pipe.transform(input, {} as any);
    expect(result[0]).not.toContain('<script>');
    expect(result[1]).not.toContain('<div>');
  });

  it('should trim whitespace', () => {
    const input = '  Hello World  ';
    const result = pipe.transform(input, {} as any);
    expect(result).toBe('Hello World');
  });

  it('should remove null bytes', () => {
    const input = 'Hello\0World';
    const result = pipe.transform(input, {} as any);
    expect(result).not.toContain('\0');
    expect(result).toBe('HelloWorld');
  });
});
