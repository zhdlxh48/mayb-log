SELECT
  COUNT(p.id) AS total
FROM
  posts AS p
WHERE
  p.draft = 0
  AND p.published_at IS NOT NULL
  AND p.id IN (
    SELECT
      rowid
    FROM
      post_fts
    WHERE
      post_fts MATCH ?
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
  );
