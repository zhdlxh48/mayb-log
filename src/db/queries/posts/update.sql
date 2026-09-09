UPDATE posts
SET
  title = ?,
  subtitle = ?,
  description = ?,
  body_markdown = ?,
  body_html = ?,
  series_id = ?,
  series_position = ?,
  tags = ?,
  published_at = ?,
  updated_at = ?,
  draft = ?,
  noindex = ?
WHERE
  id = ?;
