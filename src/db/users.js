import findByUsername from "./queries/users/find-by-username.sql";
import insertQuery from "./queries/users/insert.sql";
import updateDisplayNameQuery from "./queries/users/update-display-name.sql";

export const findUserByUsername = (db, username) =>
  db.prepare(findByUsername).bind(username).first();

export const createUser = (db, user) =>
  db
    .prepare(insertQuery)
    .bind(
      user.username,
      user.displayName,
      user.hash,
      user.salt,
      user.iterations,
      user.now,
      user.now,
    )
    .run();

export const updateDisplayName = (db, id, displayName) =>
  db
    .prepare(updateDisplayNameQuery)
    .bind(displayName, Math.floor(Date.now() / 1000), id)
    .run();
