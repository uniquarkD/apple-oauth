/* global OAuth */
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
  const loginStyle = Apple._isNativeSignInWindow()
    ? 'redirect'
    : OAuth._loginStyle('apple', config, options);
  const scope = options && options.requestPermissions ? options.requestPermissions.join('%20') : 'name%20email';

  const loginUrl = 'https://appleid.apple.com/auth/authorize'
    + '?response_type=code%20id_token'
    + '&response_mode=form_post'
    + `&redirect_uri=${config.redirectUri}`
    + `&client_id=${config.clientId}`
    + `&scope=${scope}`
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

/**
 * Checks if browser uses native sign in window
 *
 * webkit >=605 on iOS and macos shows sign in with apple as native ui screen
 * and then we need to use a redirect login style
 *
 * (Would like to have a better way to check this but it works for now)
 */
Apple._isNativeSignInWindow = function() {
  const minVersionNative = 605;
  const userAgent = ((navigator && navigator.userAgent) || '').toLowerCase();
  const match = userAgent.match(/applewebkit\/(\d+)/);
  if (match === null) {
    return false;
  }
  const version = match[1];
  return version >= minVersionNative;
};
