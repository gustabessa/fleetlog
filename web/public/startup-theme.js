// Visual preferences only; no private data or authentication is cached here.
try {
  const palette = localStorage.getItem('fleetlog.palette');
  const valid = [
    'original',
    'orange',
    'blue',
    'violet',
    'green',
    'rose',
    'amber',
    'cyan',
    'red',
    'lime',
    'mono',
    'copper',
    'navy',
    'emerald',
    'lavender',
    'magenta',
    'ruby',
    'sand',
    'olive',
    'arctic',
    'indigo',
    'mint',
    'lemon',
    'coral',
  ];
  const selectedPalette = valid.includes(palette) ? palette : 'orange';
  const theme = localStorage.getItem('fleetlog.theme') === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.palette = selectedPalette;
  document.documentElement.dataset.theme = theme;
  document.cookie = `fleetlog_pwa_theme=${selectedPalette}-${theme}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
} catch {}
