export function findUserByUsername(db, username) {
  return db.prepare(`
    SELECT id, username, display_name, password_hash, password_salt, password_iterations, status
    FROM users
    WHERE username = ?
  `).bind(username).first();
}

export function createUser(db, user) {
  return db.prepare(`
    INSERT INTO users (username, display_name, password_hash, password_salt, password_iterations, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
  `).bind(user.username, user.displayName, user.hash, user.salt, user.iterations, user.now, user.now).run();
}

export function updateDisplayName(db, id, displayName) {
  return db.prepare("UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?")
    .bind(displayName, Math.floor(Date.now() / 1000), id).run();
}
