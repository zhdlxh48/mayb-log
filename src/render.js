import ejs from "ejs";
import { formatDate, json, safeJson } from "./lib.js";
import layout from "../views/layouts/base.ejs";
import head from "../views/partials/common/head.ejs";
import navigation from "../views/partials/common/navigation.ejs";
import footer from "../views/partials/common/footer.ejs";
import pagination from "../views/partials/common/pagination.ejs";
import postRow from "../views/partials/posts/row.ejs";
import about from "../views/about/index.ejs";
import posts from "../views/posts/index.ejs";
import post from "../views/posts/show.ejs";
import postForm from "../views/posts/form.ejs";
import series from "../views/series/index.ejs";
import seriesNew from "../views/series/new.ejs";
import seriesEdit from "../views/series/edit.ejs";
import categories from "../views/categories/index.ejs";
import categoryNew from "../views/categories/new.ejs";
import categoryEdit from "../views/categories/edit.ejs";
import archive from "../views/archive/index.ejs";
import search from "../views/search/index.ejs";
import searchResults from "../views/search/results.ejs";
import login from "../views/auth/login.ejs";
import signup from "../views/auth/signup.ejs";
import profile from "../views/profile/index.ejs";
import error from "../views/errors/error.ejs";

const sources = {
  "about/index": about,
  "posts/index": posts,
  "posts/show": post,
  "posts/form": postForm,
  "series/index": series,
  "series/new": seriesNew,
  "series/edit": seriesEdit,
  "categories/index": categories,
  "categories/new": categoryNew,
  "categories/edit": categoryEdit,
  "archive/index": archive,
  "search/index": search,
  "search/results": searchResults,
  "auth/login": login,
  "auth/signup": signup,
  "profile/index": profile,
  "errors/error": error,
};
const compile = (name, source) => ejs.compile(source, { filename: `views/${name}.ejs` });
const views = Object.fromEntries(
  Object.entries(sources).map(([name, source]) => [name, compile(name, source)]),
);
const partials = {
  head: compile("partials/common/head", head),
  navigation: compile("partials/common/navigation", navigation),
  footer: compile("partials/common/footer", footer),
  pagination: compile("partials/common/pagination", pagination),
  "posts/row": compile("partials/posts/row", postRow),
  "search/results": views["search/results"],
};
const renderLayout = compile("layouts/base", layout);

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
