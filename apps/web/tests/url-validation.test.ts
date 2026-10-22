import { describe, it, expect } from 'vitest';
import { validateRepositoryUrl } from '../src/lib/validation';

describe('validateRepositoryUrl', () => {
  it('accepts valid GitHub URLs without .git', () => {
    const result = validateRepositoryUrl('https://github.com/fastapi/fastapi');
    expect(result.isValid).toBe(true);
    expect(result.owner).toBe('fastapi');
    expect(result.repo).toBe('fastapi');
    expect(result.normalizedUrl).toBe('https://github.com/fastapi/fastapi');
  });

  it('accepts valid GitHub URLs with .git suffix', () => {
    const result = validateRepositoryUrl('https://github.com/pallets/flask.git');
    expect(result.isValid).toBe(true);
    expect(result.owner).toBe('pallets');
    expect(result.repo).toBe('flask');
    expect(result.normalizedUrl).toBe('https://github.com/pallets/flask');
  });

  it('handles surrounding whitespace gracefully', () => {
    const result = validateRepositoryUrl('  https://github.com/expressjs/express  ');
    expect(result.isValid).toBe(true);
    expect(result.owner).toBe('expressjs');
    expect(result.repo).toBe('express');
  });

  it('rejects empty input', () => {
    const result = validateRepositoryUrl('   ');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Please provide a repository URL');
  });

  it('rejects malformed URLs', () => {
    const result = validateRepositoryUrl('not-a-url');
    expect(result.isValid).false;
    expect(result.error).toContain('Malformed URL');
  });

  it('rejects non-GitHub domains', () => {
    const result = validateRepositoryUrl('https://gitlab.com/owner/repo');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Unsupported host');
  });

  it('rejects SSRF attempts against loopback or private ranges', () => {
    const localhostResult = validateRepositoryUrl('http://localhost:8000/repo');
    expect(localhostResult.isValid).toBe(false);

    const privateIpResult = validateRepositoryUrl('http://192.168.1.1/test');
    expect(privateIpResult.isValid).toBe(false);

    const loopbackResult = validateRepositoryUrl('http://127.0.0.1/test');
    expect(loopbackResult.isValid).toBe(false);

    const metadataResult = validateRepositoryUrl('http://169.254.169.254/latest/meta-data');
    expect(metadataResult.isValid).toBe(false);
  });

  it('rejects URLs with embedded userinfo credentials', () => {
    const result = validateRepositoryUrl('https://user:password@github.com/owner/repo');
    expect(result.isValid).toBe(false);
  });

  it('rejects GitHub URLs missing the repository name', () => {
    const result = validateRepositoryUrl('https://github.com/fastapi');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Repository path must include both owner and repository name');
  });
});
