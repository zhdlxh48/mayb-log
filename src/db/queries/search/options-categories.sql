SELECT
  id,
  name
FROM
  categories
ORDER BY
  name COLLATE NOCASE,
  id;
