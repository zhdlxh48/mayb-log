PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'author' CHECK (role IN ('admin', 'author')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  bio TEXT NOT NULL DEFAULT '',
  homepage TEXT,
  same_as TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(same_as)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf_token TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE series (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('post', 'page')),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  search_text TEXT NOT NULL,
  author_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  categories TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(categories)),
  tags TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tags)),
  series_id TEXT REFERENCES series(slug) ON DELETE SET NULL,
  series_order INTEGER,
  image_key TEXT,
  image_alt TEXT,
  published_at INTEGER,
  updated_at INTEGER NOT NULL,
  draft INTEGER NOT NULL DEFAULT 1 CHECK (draft IN (0, 1)),
  noindex INTEGER NOT NULL DEFAULT 0 CHECK (noindex IN (0, 1)),
  CHECK ((series_id IS NULL AND series_order IS NULL) OR (series_id IS NOT NULL AND series_order IS NOT NULL))
);

CREATE INDEX sessions_user_id ON sessions(user_id);
CREATE INDEX sessions_expires_at ON sessions(expires_at);
CREATE INDEX content_publication ON content(kind, draft, published_at DESC);
CREATE INDEX content_author ON content(author_user_id, draft, published_at DESC);
CREATE UNIQUE INDEX content_series_order ON content(series_id, series_order) WHERE series_id IS NOT NULL;
