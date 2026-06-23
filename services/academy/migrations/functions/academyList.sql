CREATE OR REPLACE FUNCTION academy.academyList(
  organisationId TEXT,
  searchTerm TEXT,
  resultLimit INTEGER,
  resultOffset INTEGER
)
RETURNS SETOF academy.academies
LANGUAGE sql
STABLE
AS $$
  SELECT a.*
  FROM academy.academies a
  WHERE (organisationId IS NULL OR organisationId = '' OR a.organisation_id = organisationId)
    AND (
      searchTerm IS NULL
      OR searchTerm = ''
      OR a.name ILIKE '%' || searchTerm || '%'
      OR a.slug ILIKE '%' || searchTerm || '%'
      OR a.city ILIKE '%' || searchTerm || '%'
      OR a.postcode ILIKE '%' || searchTerm || '%'
    )
  ORDER BY a.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(resultLimit, 50), 1), 100)
  OFFSET GREATEST(COALESCE(resultOffset, 0), 0);
$$;
