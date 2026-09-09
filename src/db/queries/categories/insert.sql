INSERT INTO
  categories (name, description, created_at, updated_at)
VALUES
  (?, ?, ?, ?)
RETURNING
  id;
