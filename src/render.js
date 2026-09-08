import ejs from "ejs";
import { formatDate, json, safeJson } from "./lib.js";
import layout from "../views/layout.ejs";
import head from "../views/partials/head.ejs";
import navigation from "../views/partials/navigation.ejs";
import footer from "../views/partials/footer.ejs";
import postRow from "../views/partials/post-row.ejs";
import pagination from "../views/partials/pagination.ejs";
import about from "../views/about.ejs";
import posts from "../views/posts.ejs";
import post from "../views/post.ejs";
import postEdit from "../views/post-edit.ejs";
import series from "../views/series.ejs";
import seriesNew from "../views/series-new.ejs";
import seriesEdit from "../views/series-edit.ejs";
import categories from "../views/categories.ejs";
import categoryNew from "../views/category-new.ejs";
import categoryEdit from "../views/category-edit.ejs";
import archive from "../views/archive.ejs";
import search from "../views/search.ejs";
import searchResults from "../views/search-results.ejs";
import login from "../views/login.ejs";
import signup from "../views/signup.ejs";
import profile from "../views/profile.ejs";
import error from "../views/error.ejs";

const compile = (name, source) => ejs.compile(source, { filename: `views/${name}.ejs` });
const views = Object.fromEntries(Object.entries({ about, posts, post, "post-edit": postEdit, series, "series-new": seriesNew, "series-edit": seriesEdit, categories, "category-new": categoryNew, "category-edit": categoryEdit, archive, search, "search-results": searchResults, login, signup, profile, error }).map(([name, source]) => [name, compile(name, source)]));
const partials = {
  head: compile("partials/head", head),
  navigation: compile("partials/navigation", navigation),
  footer: compile("partials/footer", footer),
  "post-row": compile("partials/post-row", postRow),
  pagination: compile("partials/pagination", pagination),
  "search-results": views["search-results"],
};
const renderLayout = compile("layout", layout);

export function renderer(site) {
  const base = {
    site,
    title: site.name,
    description: "개발과 일상의 생각을 기록하는 MayB의 개인 아카이브.",
    canonical: "",
    noindex: false,
    jsonLd: "",
    scripts: [],
    styles: [],
    hasSession: false,
    formatDate,
    json,
    safeJson,
  };
  const partial = (name, data = {}) => partials[name]({ ...base, ...data, partial });
  return (name, data = {}, fragment = false) => {
    const locals = { ...base, ...data, partial };
    const body = views[name](locals);
    if (fragment) return body;
    return renderLayout({
      ...locals,
      body,
      head: partial("head", locals),
      navigation: partial("navigation", locals),
      footer: partial("footer", locals),
    });
  };
}
