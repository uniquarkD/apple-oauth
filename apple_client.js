import Apple from './namespace.js';

/**
 * Request Apple credentials for the user (boilerplate).
 * Called from accounts-apple.
 *
 * @param {Object}    options                             Optional
 * @param {Function}  credentialRequestCompleteCallback   Callback function to call on completion. Takes one argument, credentialToken on success, or Error on error.
 */
Apple.requestCredential = function(options, credentialRequestCompleteCallback) {
  // Support both (options, callback) and (callback).
  if (!credentialRequestCompleteCallback && typeof options === 'function') {
    credentialRequestCompleteCallback = options;
    options = {};
  } else if (!options) {
    options = {};
  }

  const config = ServiceConfiguration.configurations.findOne({
    service: 'apple',
  });
  if (!config) {
    credentialRequestCompleteCallback
      && credentialRequestCompleteCallback(new ServiceConfiguration.ConfigError());
    return;
  }

  const credentialToken = Random.secret();
  const loginStyle = OAuth._loginStyle('apple', config, options);

  const loginUrl = 'https://appleid.apple.com/auth/authorize'
    + '?response_type=code'
    + '&response_mode=form_post'
    + `&redirect_uri=${config.redirectUri}`
    + `&client_id=${config.clientId}`
    + '&scope=name%20email'
    + `&state=${OAuth._stateParam(loginStyle, credentialToken)}`;

  OAuth.launchLogin({
    loginService: 'apple',
    loginStyle,
    loginUrl,
    credentialRequestCompleteCallback,
    credentialToken,
    popupOptions: {
      height: 600,
    },
  });
};
