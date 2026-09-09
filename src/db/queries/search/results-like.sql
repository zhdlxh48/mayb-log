SELECT
  p.id,
  p.uuid,
  p.title,
  p.subtitle,
  p.description,
  p.tags,
  p.published_at,
  u.display_name AS author_name,
  s.id AS series_id,
  s.title AS series_title,
  COALESCE(
    (
      SELECT
        json_group_array(json_object('id', c.id, 'name', c.name))
      FROM
        post_categories AS pc
        JOIN categories AS c ON c.id = pc.category_id
      WHERE
        pc.post_id = p.id
    ),
    '[]'
  ) AS categories_json
FROM
  posts AS p
  JOIN users AS u ON u.id = p.author_user_id
  LEFT JOIN series AS s ON s.id = p.series_id
WHERE
  p.draft = 0
  AND p.published_at IS NOT NULL
  AND (
    ? = ''
    OR p.title LIKE ? ESCAPE '\'
    OR COALESCE(p.subtitle, '') LIKE ? ESCAPE '\'
    OR p.description LIKE ? ESCAPE '\'
    OR p.body_markdown LIKE ? ESCAPE '\'
  )
  AND (
    json_array_length(?) = 0
    OR p.series_id IN (
      SELECT
        value
      FROM
        json_each(?)
    )
  )
  AND NOT EXISTS (
    SELECT
      1
    FROM
      json_each(?) AS wanted
    WHERE
      NOT EXISTS (
        SELECT
          1
        FROM
          post_categories AS pc
        WHERE
          pc.post_id = p.id
          AND pc.category_id = wanted.value
      )
  )
  AND NOT EXISTS (
    SELECT
      1
    FROM
      json_each(?) AS wanted
    WHERE
      NOT EXISTS (
        SELECT
          1
        FROM
          json_each(p.tags) AS actual
        WHERE
          actual.value = wanted.value
      )
  )
  AND (
    ? IS NULL
    OR p.published_at >= ?
  )
  AND (
    ? IS NULL
    OR p.published_at < ?
  )
ORDER BY
  p.published_at DESC,
  p.id DESC
LIMIT
  ?
OFFSET
  ?;
