Scalar.createApiReference('#fleetlog-api-reference', {
  sources: [{ url: './openapi.json', agent: { disabled: true } }],
  theme: 'default',
  servers: [{ url: location.origin, description: 'Esta instância do FleetLog' }],
  darkMode: true,
  withDefaultFonts: false,
  hideClientButton: true,
  persistAuth: false,
  telemetry: false,
  proxyUrl: '',
  showDeveloperTools: 'never',
  showToolbar: 'never',
  mcp: { disabled: true },
  customCss:
    '.dark-mode { --scalar-color-accent: #ff9b52; --scalar-background-1: #17181c; --scalar-background-2: #222329; --scalar-color-1: #f2f2f5; }',
  // The browser uses the existing HttpOnly session; no credential is embedded here.
  fetch(input, init) {
    const url = new URL(input instanceof Request ? input.url : input, location.href);
    if (url.origin !== location.origin) {
      return Promise.reject(new Error('Use a mesma origem do FleetLog para testar a API.'));
    }
    return window.fetch(input, { ...init, credentials: 'same-origin' });
  },
});
