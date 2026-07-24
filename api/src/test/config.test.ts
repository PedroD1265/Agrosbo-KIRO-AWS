import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createProviders } from '../providers/index.js';

describe('Configuration Validation Tests (Dev vs Prod)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore process.env after each test
    process.env = originalEnv;
  });

  it('Development: local-session, local attachment, and none document provider are permitted', () => {
    const providers = createProviders(
      {
        authProvider: 'local-session',
        storageDriver: 'local',
        docExtraction: 'none',
      },
      {
        decodeToken: () => null,
        loadUser: async () => null,
        cookieName: 'test_cookie',
      },
    );

    expect(providers.identity.name).toBe('local-session');
    expect(providers.attachments.name).toBe('local');
    expect(providers.documents.name).toBe('none');
  });

  it('Production: cognito-jwt throws when COGNITO_USER_POOL_ID or COGNITO_APP_CLIENT_ID missing', () => {
    expect(() => {
      createProviders(
        {
          authProvider: 'cognito-jwt',
          storageDriver: 'local',
          docExtraction: 'none',
        },
        {
          decodeToken: () => null,
          loadUser: async () => null,
          cookieName: 'test_cookie',
        },
      );
    }).toThrow(/cognito-jwt identity provider is not yet implemented/);
  });

  it('Production: S3 attachment driver throws when S3 bucket missing or S3 provider unimplemented', () => {
    expect(() => {
      createProviders(
        {
          authProvider: 'local-session',
          storageDriver: 's3',
          docExtraction: 'none',
        },
        {
          decodeToken: () => null,
          loadUser: async () => null,
          cookieName: 'test_cookie',
        },
      );
    }).toThrow(/S3 attachment storage is not yet implemented/);
  });

  it('Document Provider: textract or azure selected without implementation throws', () => {
    expect(() => {
      createProviders(
        {
          authProvider: 'local-session',
          storageDriver: 'local',
          docExtraction: 'textract',
        },
        {
          decodeToken: () => null,
          loadUser: async () => null,
          cookieName: 'test_cookie',
        },
      );
    }).toThrow(/Textract document extraction is not yet implemented/);

    expect(() => {
      createProviders(
        {
          authProvider: 'local-session',
          storageDriver: 'local',
          docExtraction: 'azure',
        },
        {
          decodeToken: () => null,
          loadUser: async () => null,
          cookieName: 'test_cookie',
        },
      );
    }).toThrow(/Azure Document Intelligence is not yet implemented/);
  });
});
