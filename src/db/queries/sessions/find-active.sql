SELECT
  s.token_hash,
  s.csrf_token,
  s.expires_at,
  u.id,
  u.username,
  u.display_name
FROM
  sessions AS s
  JOIN users AS u ON u.id = s.user_id
WHERE
  s.token_hash = ?
  AND s.expires_at > ?
  AND u.status = 'active'
LIMIT
  1;
