SET search_path TO authorisation, public;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'authorisation'
          AND table_name = 'permissions'
          AND column_name = 'code'
    ) THEN
        UPDATE permissions
        SET code = 'academy.claim.view',
            name = 'View academy claim workflow',
            description = 'Allows viewing academy ownership claim workflow access.',
            updated_at = now()
        WHERE code = 'academy.claim';
    END IF;
END $$;

\ir procedures/001_seedAuthorisationCatalog.sql

CALL "seedAuthorisationCatalog"();

INSERT INTO schema_migrations(version)
VALUES ('007_rename_academy_claim_permission')
ON CONFLICT (version) DO NOTHING;
