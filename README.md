# quavedev:apple-oauth

Sign in with Apple handler with native cordova plugin handler. forked from jramer/apple-oauth

## Config

Look here for a good example how to get these:
[https://developer.okta.com/blog/2019/06/04/what-the-heck-is-sign-in-with-apple](https://developer.okta.com/blog/2019/06/04/what-the-heck-is-sign-in-with-apple)

The `secret` private key needs to have \n instead of newlines in the correct places.
The `redirectUri` needs to be https. [ngrok](https://ngrok.com)/[serveo](https://serveo.net) works for development but you need to have the uri added in you apple dev account in the return urls.

```
"apple": {
  "teamId": "",
  "clientId": "< your service id (for web) >",
  "nativeClientId": "< your app id (mobile) >",
  "keyId": "",
  "secret": "-----BEGIN PRIVATE KEY-----\nABC\nABC\nABC\nABC\n-----END PRIVATE KEY-----",
  "redirectUri": "https://abc.def/_oauth/apple"
},
```
