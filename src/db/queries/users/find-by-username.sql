SELECT
  id,
  username,
  display_name,
  password_hash,
  password_salt,
  password_iterations,
  status
FROM
  users
WHERE
  username = ?
LIMIT
  1;
