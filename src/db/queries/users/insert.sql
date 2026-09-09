INSERT INTO
  users (
    username,
    display_name,
    password_hash,
    password_salt,
    password_iterations,
    status,
    created_at,
    updated_at
  )
VALUES
  (?, ?, ?, ?, ?, 'pending', ?, ?);
