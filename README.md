# node-unraid-api

Exposing data from Unraid as JSON for use in custom applications.

### ⚠️🙈️ This is a work in progress, don’t use it. 🙈️⚠️

I couldn’t crack the goddamn PHP server not returning any data even with a CSRF token when trying to get info about the array, so instead this is using an [extra plugin](https://forums.unraid.net/topic/86646-plugin-unraid-json-api/) on Unraid.

## Config

Make a `.env` file in the root directory with your credentials. Sample:

```bash
UNRAID_HOST=192.168.1.111
UNRAID_USERNAME=root
UNRAID_PASSWORD=420sixtynine
SECURE=
```
