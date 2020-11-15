/* global OAuth */
import { Promise } from "meteor/promise";
import Apple from "./namespace.js";
import { Accounts } from "meteor/accounts-base";

const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

Apple.whitelistedFields = ["email", "name"];

Apple.issuer = "https://appleid.apple.com";
Apple.jwksClient = jwksClient({
  jwksUri: `${Apple.issuer}/auth/keys`,
  cache: true,
  cacheMaxAge: 1000 * 3600 * 24, // 24h in ms
});

/**
 * Verifies and parses identity token.
 *
 * @param {string} idToken Token to parse
 */
const verifyAndParseIdentityToken = (idToken, isNative = false) =>
  new Promise((resolve, reject) => {
    const decoded = jwt.decode(idToken, { complete: true });
    const { kid, alg } = decoded.header;
    const clientId = isNative ? Apple.config.nativeClientId : Apple.config.clientId;

    Apple.jwksClient.getSigningKey(kid, (err, key) => {
      if (err) {
        reject(err);
      }

      const signingKey = key.publicKey || key.rsaPublicKey;
      const parsedIdToken = jwt.verify(idToken, signingKey, {
        issuer: Apple.issuer,
        audience: clientId,
        algorithms: [alg],
      });

      const issOk = parsedIdToken.iss === Apple.issuer;
      const audOk = parsedIdToken.aud === clientId;
      const expOk = parsedIdToken.exp > Math.floor(Date.now() / 1000);

      if (issOk && audOk && expOk) {
        resolve(parsedIdToken);
      } else {
        reject(
          new Error("Apple Id token verification failed. Token mismatch.")
        );
      }
    });
  });

/**
 * Extracts data from apples tokens and formats for accounts
 *
 * @param {*} tokens tokens and data from apple
 */
const getServiceDataFromTokens = (tokens, isNative = false) => {
  const { accessToken, idToken, expiresIn } = tokens;
  const scopes = "name email";

  let parsedIdToken;

  try {
    parsedIdToken = Promise.await(verifyAndParseIdentityToken(idToken, isNative));
  } catch (error) {
    throw new Error(`Apple Id token verification failed. ${error}`);
  }
  const serviceData = {
    id: parsedIdToken.sub,
    accessToken,
    idToken,
    scope: scopes,
    expiresAt: Date.now() + 1000 * parseInt(expiresIn, 10),
    email: parsedIdToken.email,
  };

  // only set the token in serviceData if it's there. this ensures
  // that we don't lose old ones (since we only get this on the first
  // log in attempt)
  if (tokens.refreshToken) {
    serviceData.refreshToken = tokens.refreshToken;
  }

  const options = { profile: { email: serviceData.email } };

  if(tokens.fullName){
    serviceData.name = tokens.fullName;
    options.profile.name = tokens.fullName;
  }
  if (tokens.user && tokens.user.name) {
    serviceData.name = tokens.user.name;
    options.profile.name = tokens.user.name;
  }

  return isNative
    ? Accounts.updateOrCreateUserFromExternalService(
        "bapple",
        serviceData,
        options
      )
    : {
        serviceData,
        options,
      };
};

/**
 * Generates the client secret token
 *
 * @param {string} teamId apple team id eg. A1B2C3D4E5
 * @param {string} clientId apple client id eg. com.meteor.web.prod
 * @param {string} privateKey apple private key eg.-----BEGIN PRIVATE KEY-----\n....
 * @param {string} keyId apple key id eg. A1B2C3D4E5
 */
const generateToken = function (teamId, clientId, privateKey, keyId) {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600 * 24 * 180; // 180 days, max is 6 months
  const claims = {
    iss: teamId,
    iat: now,
    exp: expiry,
    aud: "https://appleid.apple.com",
    sub: clientId,
  };

  try {
    const token = jwt.sign(claims, privateKey, {
      algorithm: "ES256",
      keyid: keyId,
    });

    return token;
  } catch (err) {
    throw Object.assign(new Error(`Failed to sign token. ${err}`), {
      response: err.response,
    });
  }
};

function getAbsoluteUrlOptions(query) {
  const overrideRootUrlFromStateRedirectUrl = Meteor.settings?.packages?.['uniquarkd:apple-oauth']?.overrideRootUrlFromStateRedirectUrl;
  if (!overrideRootUrlFromStateRedirectUrl) {
    return undefined;
  }
  try {
    const state = OAuth._stateFromQuery(query) || {};
    console.log(`state`, state);

    const redirectUrl = state.redirectUrl;
    return {
      rootUrl: redirectUrl,
    }
  } catch (e) {
    console.error(
      `Failed to complete OAuth handshake with Apple because it was not able to obtain the redirect url from the state and you are using overrideRootUrlFromStateRedirectUrl.`, e
    );
    return undefined;
  }
}

/**
 * Requests tokens and user from apple
 *
 * @param {*} query auth/authorize redirect response from apple
 */
const getTokens = (query, isNative = false) => {
  const endpoint = "https://appleid.apple.com/auth/token";
  Apple.config = ServiceConfiguration.configurations.findOne({
    service: "bapple",
  });
  if (!Apple.config) {
    throw new ServiceConfiguration.ConfigError("BApple");
  }
  const clientId = isNative ? Apple.config.nativeClientId : Apple.config.clientId;
  const token = generateToken(
    Apple.config.teamId,
    clientId,
    Apple.config.secret,
    Apple.config.keyId
  );

  let response;
  try {
    const {rootUrl} = getAbsoluteUrlOptions(query) || {};

    const redirectUri = rootUrl || Apple.config.redirectUri;
    const redirectUriWithOauth = redirectUri.includes('/_oauth/apple') ? redirectUri : `${redirectUri}${redirectUri.endsWith('/') ? '' : '/'}_oauth/apple`;

    response = HTTP.post(endpoint, {
      params: {
        code: query.code,
        client_id: clientId,
        client_secret: token,
        grant_type: "authorization_code",
        redirect_uri: redirectUriWithOauth,
      },
    });
  } catch (err) {
    throw Object.assign(
      new Error(
        `Failed to complete OAuth handshake with Apple. ${err.message}`
      ),
      {
        response: err.response,
      }
    );
  }
  let user;
  if (query.user) {
    try {
      user = JSON.parse(query.user);
    } catch (e) {
      user = query.user;
    }
  }
  if (response.data.error) {
    /**
     * The http response was a json object with an error attribute
     */
    throw new Error(
      `Failed to complete OAuth handshake with Apple. ${response.data.error}`
    );
  } else {
    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
      idToken: response.data.id_token,
      user,
      fullName: query.fullName
        ? [
            query.fullName.givenName,
            query.fullName.middleName,
            query.fullName.familyName,
          ].join(" ")
        : "",
    };
  }
};

const getServiceData = (query) => getServiceDataFromTokens(getTokens(query, false), false);
OAuth.registerService("bapple", 2, null, getServiceData);
Accounts.registerLoginHandler((query) => {
  if (query.methodName != "native-apple") {
    return;
  }
  return getServiceDataFromTokens(getTokens(query, true), true);
});
