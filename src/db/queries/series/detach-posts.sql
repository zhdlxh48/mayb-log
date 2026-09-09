UPDATE posts
SET
  series_id = NULL,
  series_position = NULL
WHERE
  series_id = ?;
