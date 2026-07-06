\ir schema/001_courseSchema.sql
SET search_path TO courses, public;

\ir schema/002_schemaMigrations.sql
\ir types/001_courseTypes.sql
\ir tables/001_courseTypes.sql
\ir tables/002_courses.sql
\ir tables/003_courseActivities.sql
\ir tables/004_courseSchedules.sql
\ir tables/005_courseSessions.sql
\ir tables/006_sessionLocations.sql
\ir tables/007_sessionStatusHistory.sql
\ir tables/008_idempotencyKeys.sql
\ir tables/009_outboxEvents.sql
\ir functions/001_databaseReady.sql
\ir functions/002_courseTypeGet.sql
\ir functions/003_courseTypesList.sql
\ir functions/004_courseGet.sql
\ir functions/005_coursesList.sql
\ir functions/006_courseActivitiesList.sql
\ir procedures/001_courseTypeUpsert.sql
\ir procedures/002_courseTypeDelete.sql
\ir procedures/003_courseUpsert.sql
\ir procedures/004_courseDelete.sql
\ir procedures/005_courseActivityUpsert.sql
\ir procedures/006_courseActivityDelete.sql
\ir rollfinders/001_publicCourseCompatibilityViews.sql

INSERT INTO schema_migrations(version) VALUES ('001_coreSchema')
ON CONFLICT (version) DO NOTHING;
