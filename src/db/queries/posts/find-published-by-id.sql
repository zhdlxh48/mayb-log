SELECT
  p.id,
  p.uuid,
  p.title,
  p.subtitle,
  p.description,
  p.tags,
  p.published_at,
  p.updated_at,
  p.body_html,
  p.noindex,
  p.series_position,
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
  p.id = ?
  AND p.draft = 0
  AND p.published_at IS NOT NULL
LIMIT
  1;
