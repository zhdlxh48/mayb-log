SELECT
  id,
  title,
  description
FROM
  series
WHERE
  id = ?
LIMIT
  1;
