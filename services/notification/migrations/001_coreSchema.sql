\ir schema/001_notificationSchema.sql
SET search_path TO notification, public;

\ir schema/002_schemaMigrations.sql
\ir types/001_notificationTypes.sql
\ir tables/001_notifications.sql
\ir tables/002_emailMessages.sql
\ir tables/003_emailRecipients.sql
\ir tables/004_notificationAttachments.sql
\ir tables/005_notificationAttempts.sql
\ir tables/006_outboxEvents.sql

INSERT INTO notification.schema_migrations(version) VALUES ('001_coreSchema')
ON CONFLICT (version) DO NOTHING;
