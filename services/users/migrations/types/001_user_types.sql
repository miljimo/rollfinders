DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'users'::regnamespace AND typname = 'UserStatus') THEN
        CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'LOCKED', 'DELETED', 'DISABLED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'users'::regnamespace AND typname = 'UserEmailStatus') THEN
        CREATE TYPE "UserEmailStatus" AS ENUM ('VALID', 'INVALID', 'PENDING_VERIFICATION');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'users'::regnamespace AND typname = 'DirectPermissionEffect') THEN
        CREATE TYPE "DirectPermissionEffect" AS ENUM ('ALLOW', 'DENY');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'users'::regnamespace AND typname = 'OrganisationStatus') THEN
        CREATE TYPE "OrganisationStatus" AS ENUM ('ACTIVE', 'DISABLED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'users'::regnamespace AND typname = 'CredentialType') THEN
        CREATE TYPE "CredentialType" AS ENUM ('EMAIL_PASSWORD', 'USERNAME_PASSWORD', 'GOOGLE', 'MICROSOFT', 'GITHUB', 'PASSKEY', 'API_KEY', 'SERVICE_ACCOUNT_SECRET');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'users'::regnamespace AND typname = 'CredentialStatus') THEN
        CREATE TYPE "CredentialStatus" AS ENUM ('ACTIVE', 'DISABLED', 'REVOKED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typnamespace = 'users'::regnamespace AND typname = 'MfaMethodType') THEN
        CREATE TYPE "MfaMethodType" AS ENUM ('TOTP', 'EMAIL_OTP', 'SMS_OTP');
    END IF;

END;
$$;
