SELECT
  p.id,
  p.uuid,
  p.title,
  p.subtitle,
  p.description,
  p.body_markdown,
  p.series_id,
  p.series_position,
  p.tags,
  p.published_at,
  p.draft,
  p.noindex,
  COALESCE(
    (
      SELECT
        json_group_array(pc.category_id)
      FROM
        post_categories AS pc
      WHERE
        pc.post_id = p.id
    ),
    '[]'
  ) AS category_ids
FROM
  posts AS p
WHERE
  p.id = ?
LIMIT
  1;
