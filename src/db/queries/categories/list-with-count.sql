SELECT
  c.id,
  c.name,
  c.description,
  COUNT(p.id) AS post_count
FROM
  categories AS c
  LEFT JOIN post_categories AS pc ON pc.category_id = c.id
  LEFT JOIN posts AS p ON p.id = pc.post_id
  AND p.draft = 0
  AND p.published_at IS NOT NULL
GROUP BY
  c.id
ORDER BY
  c.name COLLATE NOCASE,
  c.id;
