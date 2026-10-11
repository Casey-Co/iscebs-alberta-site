/*
  WIX CONNECTION SETTINGS
  -----------------------
  This is the only file you should need to change if the Wix backend changes.

  WIX_CLIENT_ID    Found in Wix: Headless Settings > OAuth apps > Client ID.
                   It is public by design (visitor read access only). Never put
                   an admin API key or client secret here.
  COLLECTIONS      The ID of each CMS collection in Wix (not its display name).
                   Find it in Wix: CMS > open the collection > Manage Fields / settings.
*/
window.WIX_SETTINGS = {
  WIX_CLIENT_ID: 'a32b1e07-fe9f-489b-862f-11d1e30287d0',
  COLLECTIONS: {
    boardMembers: 'Import2' // "Board Members" collection
  }
};
