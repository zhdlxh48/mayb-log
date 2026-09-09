INSERT INTO
  categories (name, description, created_at, updated_at)
VALUES
  (?, '', ?, ?)
ON CONFLICT (name) DO NOTHING;
