INSERT INTO
  posts (
    uuid,
    author_user_id,
    title,
    subtitle,
    description,
    body_markdown,
    body_html,
    series_id,
    series_position,
    tags,
    published_at,
    created_at,
    updated_at,
    draft,
    noindex
  )
VALUES
  (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
RETURNING
  id;
