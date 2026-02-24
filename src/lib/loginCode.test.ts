import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isValidLoginCode, formatLoginCode } from './loginCode.ts';
import { generateLoginCode } from './loginCodeGenerator.ts';

describe('Login Code Generation', () => {
  it('should generate an 8-character string', () => {
    const code = generateLoginCode();
    assert.strictEqual(code.length, 8);
  });

  it('should only contain valid characters', () => {
    const code = generateLoginCode();
    // Valid characters are A-Z, 0-9, excluding O, 0, I, 1, l
    const validChars = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/;
    assert.ok(validChars.test(code), `Code ${code} contains invalid characters`);
  });

  it('should generate different codes', () => {
    const code1 = generateLoginCode();
    const code2 = generateLoginCode();
    assert.notStrictEqual(code1, code2);
  });
});

describe('Login Code Validation', () => {
  it('should validate correct codes', () => {
    assert.strictEqual(isValidLoginCode('ABCDEFGH'), true);
    assert.strictEqual(isValidLoginCode('12345678'), true);
  });

  it('should invalidate incorrect lengths', () => {
    assert.strictEqual(isValidLoginCode('ABC'), false);
    assert.strictEqual(isValidLoginCode('ABCDEFGHI'), false);
  });

  it('should invalidate incorrect characters', () => {
    // Though generateLoginCode avoids confusing chars, isValidLoginCode allows A-Z0-9 generally
    // based on the implementation provided earlier.
    // Let's check the implementation again.
    // The implementation: const validChars = /^[A-Z0-9]+$/;
    assert.strictEqual(isValidLoginCode('ABC-DEFG'), false);
    assert.strictEqual(isValidLoginCode('abcdefg'), false); // Assuming case sensitive? No, the regex is ^[A-Z0-9]+$ but test(code.toUpperCase()) is called.
    assert.strictEqual(isValidLoginCode('ABCDEFG!'), false);
  });
});

describe('Login Code Formatting', () => {
  it('should format code with a space in the middle', () => {
    assert.strictEqual(formatLoginCode('ABCDEFGH'), 'ABCD EFGH');
  });

  it('should not format invalid length codes', () => {
    assert.strictEqual(formatLoginCode('ABC'), 'ABC');
  });
});
