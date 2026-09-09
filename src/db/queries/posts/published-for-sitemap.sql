SELECT
  p.id,
  p.title,
  p.description,
  p.published_at,
  p.updated_at,
  u.display_name AS author_name
FROM
  posts AS p
  JOIN users AS u ON u.id = p.author_user_id
WHERE
  p.draft = 0
  AND p.published_at IS NOT NULL
  AND p.noindex = 0
ORDER BY
  p.published_at DESC,
  p.id DESC;
