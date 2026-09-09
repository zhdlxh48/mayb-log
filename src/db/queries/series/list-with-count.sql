SELECT
  s.id,
  s.title,
  s.description,
  COUNT(p.id) AS post_count
FROM
  series AS s
  LEFT JOIN posts AS p ON p.series_id = s.id
  AND p.draft = 0
  AND p.published_at IS NOT NULL
GROUP BY
  s.id
ORDER BY
  s.title COLLATE NOCASE,
  s.id;
