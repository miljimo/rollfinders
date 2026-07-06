CREATE OR REPLACE FUNCTION users_list(
    p_actor_user_id text,
    p_actor_academy_id text DEFAULT NULL,
    p_search text DEFAULT NULL,
    p_role text DEFAULT NULL,
    p_status text DEFAULT NULL,
    p_email_status text DEFAULT NULL,
    p_limit integer DEFAULT 10,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    id text,
    name text,
    email text,
    username text,
    first_name text,
    last_name text,
    phone text,
    password_hash text,
    role text,
    academy_id text,
    status text,
    disabled boolean,
    is_protected boolean,
    email_status text,
    last_login_at timestamptz,
    created_at timestamptz
)
LANGUAGE sql
STABLE
SET search_path TO users, public
AS $$
    SELECT
        u.id,
        NULLIF(u.display_name, '') AS name,
        COALESCE((
            SELECT c.credential_identifier
            FROM credentials c
            WHERE c.user_id = u.id
              AND c.credential_type = 'EMAIL_PASSWORD'
            ORDER BY c.created_at ASC
            LIMIT 1
        ), '') AS email,
        (
            SELECT c.credential_identifier
            FROM credentials c
            WHERE c.user_id = u.id
              AND c.credential_type = 'USERNAME_PASSWORD'
            ORDER BY c.created_at ASC
            LIMIT 1
        ) AS username,
        u.first_name,
        u.last_name,
        NULL::text AS phone,
        ''::text AS password_hash,
        CASE
            WHEN u.is_protected THEN 'SUPER_ADMIN'
            ELSE COALESCE((
                SELECT r.key
                FROM authorisation.user_roles ur
                JOIN authorisation.roles r ON r.id = ur.role_id
                WHERE ur.user_id = u.id
                ORDER BY r.level DESC, ur.created_at ASC
                LIMIT 1
            ), 'STANDARD_USER')
        END AS role,
        (
            SELECT ou.organisation_id
            FROM organisation_users ou
            WHERE ou.user_id = u.id
              AND ou.status = 'ACTIVE'
            ORDER BY ou.created_at ASC
            LIMIT 1
        ) AS academy_id,
        u.status::text,
        u.disabled,
        u.is_protected,
        COALESCE(u.email_status::text, 'VALID') AS email_status,
        (
            SELECT max(s.last_activity_at)
            FROM sessions s
            WHERE s.user_id = u.id
        ) AS last_login_at,
        u.created_at
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
      AND (
          p_role IS NULL
          OR p_role = ''
          OR CASE
              WHEN u.is_protected THEN 'SUPER_ADMIN'
              ELSE COALESCE((
                  SELECT r.key
                  FROM authorisation.user_roles ur
                  JOIN authorisation.roles r ON r.id = ur.role_id
                  WHERE ur.user_id = u.id
                  ORDER BY r.level DESC, ur.created_at ASC
                  LIMIT 1
              ), 'STANDARD_USER')
          END = p_role
      )
      AND (p_actor_academy_id IS NULL OR p_actor_academy_id = '' OR EXISTS (
          SELECT 1 FROM organisation_users ou
          WHERE ou.user_id = u.id
            AND ou.organisation_id = p_actor_academy_id
            AND ou.status = 'ACTIVE'
      ))
      AND (p_status IS NULL OR p_status = '' OR u.status::text = p_status)
      AND (p_email_status IS NULL OR p_email_status = '' OR u.email_status::text = p_email_status)
    ORDER BY u.created_at DESC, email ASC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 100)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;
