import { PAGE_SIZE } from "../lib.js";
import { escapeLike, ftsPhrase } from "../search.js";
import countFts from "./queries/search/count-fts.sql";
import countLike from "./queries/search/count-like.sql";
import optionsCategories from "./queries/search/options-categories.sql";
import optionsSeries from "./queries/search/options-series.sql";
import resultsFts from "./queries/search/results-fts.sql";
import resultsLike from "./queries/search/results-like.sql";

function sharedParams(filters) {
  const series = JSON.stringify(filters.series);
  return [
    series,
    series,
    JSON.stringify(filters.categories),
    JSON.stringify(filters.tags),
    filters.fromEpoch,
    filters.fromEpoch,
    filters.toEpoch,
    filters.toEpoch,
  ];
}

export async function searchPosts(db, filters, includeOptions = true) {
  const useFts = [...filters.q].length >= 3;
  const like = `%${escapeLike(filters.q)}%`;
  const params = useFts
    ? [ftsPhrase(filters.q), ...sharedParams(filters)]
    : [filters.q, like, like, like, like, ...sharedParams(filters)];
  const statements = [];
  if (includeOptions) statements.push(db.prepare(optionsSeries), db.prepare(optionsCategories));
  statements.push(
    db.prepare(useFts ? countFts : countLike).bind(...params),
    db
      .prepare(useFts ? resultsFts : resultsLike)
      .bind(...params, PAGE_SIZE, (filters.page - 1) * PAGE_SIZE),
  );
  const results = await db.batch(statements);
  let index = 0;
  const series = includeOptions ? results[index++].results : null;
  const categories = includeOptions ? results[index++].results : null;
  const total = results[index++].results[0].total;
  return { series, categories, total, posts: results[index].results };
}
