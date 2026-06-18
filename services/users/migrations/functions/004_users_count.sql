CREATE OR REPLACE FUNCTION users_count(
    p_actor_user_id text,
    p_actor_academy_id text DEFAULT NULL,
    p_search text DEFAULT NULL,
    p_role text DEFAULT NULL,
    p_status text DEFAULT NULL,
    p_email_status text DEFAULT NULL
)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path TO users, public
AS $$
    SELECT count(*)::integer
    FROM users u
    WHERE (
        COALESCE(trim(p_search), '') = ''
        OR u.display_name ILIKE '%' || p_search || '%'
        OR EXISTS (
            SELECT 1
            FROM credentials c
            WHERE c.user_id = u.id
              AND c.credential_identifier ILIKE '%' || p_search || '%'
        )
      )
      AND (p_role IS NULL OR p_role = '' OR EXISTS (
          SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_key = p_role
      ))
      AND (p_actor_academy_id IS NULL OR p_actor_academy_id = '' OR EXISTS (
          SELECT 1 FROM organisation_users ou
          WHERE ou.user_id = u.id
            AND ou.organisation_id = p_actor_academy_id
            AND ou.status = 'ACTIVE'
      ))
      AND (p_status IS NULL OR p_status = '' OR u.status::text = p_status)
      AND (p_email_status IS NULL OR p_email_status = '' OR p_email_status = 'VALID');
$$;
