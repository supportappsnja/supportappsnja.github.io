/* Site settings. */

/* First half of the tagline under the title. It is followed by "made deep in the dark." */
const TAGLINE_LEAD = 'Tiny worlds,';

/*
  One entry per app. Each entry becomes a satellite on the landing page, a line in the
  top-right transmission loop, and a page at /<slug>/ (with its legal pages beside it).
  playStoreUrl / appStoreUrl: store listing links. Leave '#' until each listing is live.
  While a link is '#', its badge stays dimmed; the "Coming soon" label shows until every link is set.
*/
const APPS = [
  {
    slug: 'orbit-snake',
    name: 'Orbit Snake',
    transmission: 'something is orbiting down here.',
    playStoreUrl: '#',
    appStoreUrl: '#',
    satellite: { scene: 'orbit', accent: '#5dffb0', core: '#7ec8ff', orb: '#ffd56a', ring: '#5078b4' }
  }
];
