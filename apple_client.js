/* global OAuth */
import Apple from "./namespace.js";
import { Accounts } from "meteor/accounts-base";
import semver from "semver-lite";

/**
 * Request Apple credentials for the user (boilerplate).
 * Called from accounts-apple.
 *
 * @param {Object}    options                             Optional
 * @param {Function}  credentialRequestCompleteCallback   Callback function to call on completion. Takes one argument, credentialToken on success, or Error on error.
 */
Apple.requestCredential = function(options, nativeCallback, oauthCallback) {
    const nativeFlow = hasSupportForNativeLogin();

    let credentialRequestCompleteCallback = nativeFlow ?
        nativeCallback :
        oauthCallback;
    // Support both (options, callback) and (callback).
    if (!credentialRequestCompleteCallback && typeof options === "function") {
        credentialRequestCompleteCallback = options;
        options = {};
    } else if (!options) {
        options = {};
    }
    const config = ServiceConfiguration.configurations.findOne({
        service: "apple",
    });
    if (!config) {
        credentialRequestCompleteCallback &&
            credentialRequestCompleteCallback(new ServiceConfiguration.ConfigError());
        return;
    }

    if (!nativeFlow) {
        const credentialToken = Random.secret();
        const loginStyle = Apple._isNativeSignInWindow() ?
            "redirect" :
            OAuth._loginStyle("apple", config, options);
        const scope =
            options && options.requestPermissions ?
            options.requestPermissions.join("%20") :
            "name%20email";

        const loginUrl =
            "https://appleid.apple.com/auth/authorize" +
            "?response_type=code%20id_token" +
            "&response_mode=form_post" +
            `&redirect_uri=${config.redirectUri}` +
            `&client_id=${config.clientId}` +
            `&scope=${scope}` +
            `&state=${OAuth._stateParam(loginStyle, credentialToken)}`;

        OAuth.launchLogin({
            loginService: "apple",
            loginStyle,
            loginUrl,
            credentialRequestCompleteCallback,
            credentialToken,
            popupOptions: {
                height: 600,
            },
        });
        return;
    }

    const scope = [];
    const requestPermissions = (options && options.requestPermissions) || [];
    if (requestPermissions.includes("name")) {
        scope.push(0);
    }
    if (requestPermissions.includes("email")) {
        scope.push(1);
    }

    window.cordova.plugins.SignInWithApple.signin({ requestedScopes: scope },
        function(succ) {
            Accounts.callLoginMethod({
                methodArguments: [
                    {...succ, code: succ.authorizationCode, methodName: "native-apple" },
                ],
                userCallback: credentialRequestCompleteCallback,
            });
        },
        function(err) {
            console.error("err", err);
            callback(err, null);
        }
    );
};

function hasSupportForNativeLogin() {
    if (!Meteor.isCordova) return false;

    const isiOS = device.platform === "iOS";

    return isiOS && semver.gte(device.version, "13.0.0");
}
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
    const userAgent = ((navigator && navigator.userAgent) || "").toLowerCase();
    const match = userAgent.match(/applewebkit\/(\d+)/);
    if (match === null) {
        return false;
    }
    const version = match[1];
    return version >= minVersionNative;
};