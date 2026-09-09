SELECT
  id,
  uuid
FROM
  posts
WHERE
  id = ?
LIMIT
  1;
