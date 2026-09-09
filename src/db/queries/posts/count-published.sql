SELECT
  COUNT(id) AS total
FROM
  posts
WHERE
  draft = 0
  AND published_at IS NOT NULL;
