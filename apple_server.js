import { Accounts } from 'meteor/accounts-base';
import Apple from './namespace.js';

const jwt = require('jsonwebtoken');

Apple.whitelistedFields = ['email', 'name'];

const getServiceDataFromTokens = (tokens) => {
  const { accessToken, idToken, expiresIn } = tokens;
  const scopes = 'name email';
  const parsedIdToken = jwt.decode(idToken);

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

  return {
    serviceData,
    options: {},
  };
};

const generateToken = function(teamId, clientId, privateKey, keyId) {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600 * 24 * 180; // 180 days, max is 6 months
  const claims = {
    iss: teamId,
    iat: now,
    exp: expiry,
    aud: 'https://appleid.apple.com',
    sub: clientId,
  };

  try {
    const token = jwt.sign(claims, privateKey, {
      algorithm: 'ES256',
      keyid: keyId,
    });

    return token;
  } catch (err) {
    throw _.extend(new Error(`Failed to sign token. ${err}`), {
      response: err.response,
    });
  }
};

const getTokens = (query) => {
  const config = ServiceConfiguration.configurations.findOne({ service: 'apple' });
  if (!config) {
    throw new ServiceConfiguration.ConfigError();
  }
  const endpoint = 'https://appleid.apple.com/auth/token';
  const token = generateToken(config.teamId, config.clientId, config.secret, config.keyId);

  let response;
  try {
    response = HTTP.post(endpoint, {
      params: {
        code: query.code,
        client_id: config.clientId,
        client_secret: token,
        grant_type: 'authorization_code',
        redirect_uri: config.redirectUri,
      },
    });
  } catch (err) {
    throw Object.assign(
      new Error(`Failed to complete OAuth handshake with Apple. ${err.message}`),
      {
        response: err.response,
      },
    );
  }

  if (response.data.error) {
    /**
     * The http response was a json object with an error attribute
     */
    throw new Error(`Failed to complete OAuth handshake with Apple. ${response.data.error}`);
  } else {
    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
      idToken: response.data.id_token,
    };
  }
};

Accounts.registerLoginHandler((request) => {
  console.log('Are we ever here?????');
  console.log(`req ${JSON.stringify(request)}`);
  if (request.appleSignIn !== true) {
    return;
  }

  const tokens = {
    accessToken: request.accessToken,
    refreshToken: request.refreshToken,
    idToken: request.idToken,
  };

  if (request.serverAuthCode) {
    Object.assign(
      tokens,
      getTokens({
        code: request.serverAuthCode,
      }),
    );
  }

  const result = getServiceDataFromTokens(tokens);

  return Accounts.updateOrCreateUserFromExternalService(
    'apple',
    {
      id: request.userId,
      idToken: request.idToken,
      accessToken: request.accessToken,
      email: request.email,
      ...result.serviceData,
    },
    result.options,
  );
});

const getServiceData = query => getServiceDataFromTokens(getTokens(query));
OAuth.registerService('apple', 2, null, getServiceData);

Apple.retrieveCredential = (credentialToken, credentialSecret) => OAuth.retrieveCredential(credentialToken, credentialSecret);
