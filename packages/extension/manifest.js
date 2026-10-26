const commonManifest = require('./manifest.common.json');

module.exports = env => {
  if (env !== 'chromium' && env !== 'firefox') {
    throw new Error(`Unsupported browser target: ${env}`);
  }

  // Each build owns its manifest; Firefox must not mutate the Chromium seed.
  const manifest = JSON.parse(JSON.stringify(commonManifest));
  manifest.browser = env;

  if (env === 'chromium') {
    manifest.options_page = 'options.html';
  } else {
    manifest.manifest_version = 2;
    manifest.browser_action = manifest.action;
    manifest.background = {
      scripts: ['vendors/browser-polyfill.js', 'background.js'],
      persistent: true
    };
    manifest.options_ui = { page: 'options.html', browser_style: true };
    manifest.permissions = manifest.permissions
      .filter(permission => permission !== 'offscreen')
      .concat('<all_urls>');
    manifest.web_accessible_resources = manifest.web_accessible_resources.reduce(
      (resources, entry) => resources.concat(entry.resources),
      []
    );
    manifest.content_security_policy =
      manifest.content_security_policy.extension_pages;
    delete manifest.action;
    delete manifest.host_permissions;
    delete manifest.minimum_chrome_version;
  }

  return manifest;
};
