SELECT
  id,
  name,
  description
FROM
  categories
WHERE
  id = ?
LIMIT
  1;
