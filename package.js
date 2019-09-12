Package.describe({
  name: "bigowl:apple",
  version: "0.0.1",
  summary: "OAuth handler for Sign in with Apple",
  git: "https://github.com/jramer/bigowl-apple",
  documentation: "README.md"
});

Package.onUse(function(api) {
  api.versionsFrom("1.8.1");
  api.use("ecmascript");
  api.use("accounts-ui", ["client", "server"]);
  api.use("oauth2", ["client", "server"]);
  api.use("oauth", ["client", "server"]);
  api.use("http", ["server"]);
  api.use(["underscore", "service-configuration"], ["client", "server"]);
  api.use(["random", "templating"], "client");

  api.export("Apple");

  api.addFiles(["apple_configure.html", "apple_configure.js"], "client");

  api.mainModule("apple_server.js", "server");
  api.mainModule("apple_client.js", "client");
});

Package.onTest(function(api) {
  api.use("ecmascript");
  api.use("tinytest");
  api.use("bigowl:apple");
  api.mainModule("apple-tests.js");
});
