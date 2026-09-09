SELECT
  id,
  title
FROM
  series
ORDER BY
  title COLLATE NOCASE,
  id;
