INSERT INTO
  series (title, description, created_at, updated_at)
VALUES
  (?, ?, ?, ?)
RETURNING
  id;
