import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePrismaDatasourceUrl } from './db.ts';

describe('resolvePrismaDatasourceUrl', () => {
  it('prefers the Prisma Accelerate URL when present', () => {
    const env = {
      jacxi_PRISMA_DATABASE_URL: 'prisma+postgres://accelerate.prisma-data.net/?api_key=test',
      DATABASE_URL: 'postgresql://localhost:5432/app',
      jacxi_DATABASE_URL: 'postgresql://other:5432/app',
    } as NodeJS.ProcessEnv;

    assert.equal(resolvePrismaDatasourceUrl(env), env.jacxi_PRISMA_DATABASE_URL);
  });

  it('falls back to DATABASE_URL when the Prisma-specific variable is missing', () => {
    const env = {
      DATABASE_URL: 'postgresql://localhost:5432/app',
    } as NodeJS.ProcessEnv;

    assert.equal(resolvePrismaDatasourceUrl(env), env.DATABASE_URL);
  });

  it('falls back to jacxi_DATABASE_URL when neither Prisma nor DATABASE_URL is configured', () => {
    const env = {
      jacxi_DATABASE_URL: 'postgresql://localhost:5432/app',
    } as NodeJS.ProcessEnv;

    assert.equal(resolvePrismaDatasourceUrl(env), env.jacxi_DATABASE_URL);
  });
});
