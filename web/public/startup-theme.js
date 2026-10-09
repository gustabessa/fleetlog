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
  ];
  if (valid.includes(palette)) document.documentElement.dataset.palette = palette;
  const theme = localStorage.getItem('fleetlog.theme');
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
} catch {}
