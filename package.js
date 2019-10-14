Package.describe({
  name: 'bigowl:apple-oauth',
  version: '1.0.0',
  summary: 'Sign in with Apple OAuth flow',
  git: 'https://github.com/jramer/apple-oauth',
});

Package.onUse(function(api) {
  api.versionsFrom('1.8.1')
  api.use('ecmascript');
  api.use('oauth2', ['client', 'server']);
  api.use('oauth', ['client', 'server']);
  api.use('http', ['server']);
  api.use(['service-configuration'], ['client', 'server']);
  api.use(['random'], 'client');

  api.addFiles('apple_server.js', 'server');
  api.addFiles('apple_client.js', 'client');

  api.mainModule('namespace.js');

  api.export('Apple');
});

Npm.depends({
  'jsonwebtoken': '8.5.1',
  'jwks-rsa': '1.6.0',
});
