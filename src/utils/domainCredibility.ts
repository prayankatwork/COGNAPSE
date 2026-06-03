type Bias = 'left' | 'left-center' | 'center' | 'right-center' | 'right' | 'pro-science' | 'conspiracy' | 'satire';
type Factual = 'very-high' | 'high' | 'mixed' | 'low' | 'very-low';

interface DomainEntry {
  bias: Bias;
  factual: Factual;
}

const domainData: Record<string, DomainEntry> = {
  // Pro-science / highest credibility
  'reuters.com': { bias: 'center', factual: 'very-high' },
  'apnews.com': { bias: 'center', factual: 'very-high' },
  'ap.org': { bias: 'center', factual: 'very-high' },
  'bbc.com': { bias: 'center', factual: 'very-high' },
  'bbc.co.uk': { bias: 'center', factual: 'very-high' },
  'npr.org': { bias: 'center', factual: 'very-high' },
  'pbs.org': { bias: 'center', factual: 'very-high' },
  'wsj.com': { bias: 'center', factual: 'very-high' },
  'economist.com': { bias: 'center', factual: 'very-high' },
  'bloomberg.com': { bias: 'center', factual: 'very-high' },
  'ft.com': { bias: 'center', factual: 'very-high' },
  'c-span.org': { bias: 'center', factual: 'very-high' },
  'npr.com': { bias: 'center', factual: 'very-high' },

  // Left-center leaning, high factual
  'nytimes.com': { bias: 'left-center', factual: 'high' },
  'washingtonpost.com': { bias: 'left-center', factual: 'high' },
  'theguardian.com': { bias: 'left-center', factual: 'high' },
  'cnn.com': { bias: 'left-center', factual: 'high' },
  'politifact.com': { bias: 'left-center', factual: 'high' },
  'factcheck.org': { bias: 'center', factual: 'very-high' },
  'snopes.com': { bias: 'center', factual: 'high' },
  'usatoday.com': { bias: 'center', factual: 'high' },
  'nbcnews.com': { bias: 'left-center', factual: 'high' },
  'abcnews.go.com': { bias: 'center', factual: 'high' },
  'cbsnews.com': { bias: 'center', factual: 'high' },
  'newyorker.com': { bias: 'left-center', factual: 'high' },
  'theatlantic.com': { bias: 'left-center', factual: 'high' },
  'time.com': { bias: 'center', factual: 'high' },
  'newsweek.com': { bias: 'center', factual: 'mixed' },
  'forbes.com': { bias: 'center', factual: 'high' },
  'businessinsider.com': { bias: 'center', factual: 'mixed' },
  'recode.net': { bias: 'left-center', factual: 'high' },
  'vox.com': { bias: 'left-center', factual: 'high' },
  'slate.com': { bias: 'left-center', factual: 'high' },
  'huffpost.com': { bias: 'left-center', factual: 'mixed' },
  'huffingtonpost.com': { bias: 'left-center', factual: 'mixed' },
  'motherjones.com': { bias: 'left-center', factual: 'mixed' },
  'msnbc.com': { bias: 'left-center', factual: 'mixed' },
  'thedailybeast.com': { bias: 'left-center', factual: 'mixed' },
  'propublica.org': { bias: 'left-center', factual: 'very-high' },
  'insideclimatenews.org': { bias: 'left-center', factual: 'high' },

  // Right-center leaning, high factual
  'foxnews.com': { bias: 'right-center', factual: 'mixed' },
  'nypost.com': { bias: 'right-center', factual: 'mixed' },
  'washingtontimes.com': { bias: 'right-center', factual: 'mixed' },
  'washingtonexaminer.com': { bias: 'right-center', factual: 'high' },
  'dailymail.co.uk': { bias: 'right-center', factual: 'mixed' },
  'thehill.com': { bias: 'center', factual: 'high' },
  'nationalreview.com': { bias: 'right-center', factual: 'high' },
  'reason.com': { bias: 'right-center', factual: 'high' },
  'thespectator.com': { bias: 'right-center', factual: 'high' },
  'townhall.com': { bias: 'right-center', factual: 'mixed' },
  'dailycaller.com': { bias: 'right-center', factual: 'mixed' },
  'washingtonexaminer.org': { bias: 'right-center', factual: 'high' },

  // Left, low-mixed factual
  'palmerreport.com': { bias: 'left', factual: 'mixed' },
  'shareblue.com': { bias: 'left', factual: 'low' },
  'occupy.com': { bias: 'left', factual: 'low' },
  'rawstory.com': { bias: 'left', factual: 'mixed' },
  'alternet.org': { bias: 'left', factual: 'mixed' },
  'commondreams.org': { bias: 'left', factual: 'mixed' },
  'truthout.org': { bias: 'left', factual: 'mixed' },
  'democracynow.org': { bias: 'left-center', factual: 'high' },
  'thenation.com': { bias: 'left', factual: 'high' },

  // Right, low-mixed factual
  'breitbart.com': { bias: 'right', factual: 'low' },
  'infowars.com': { bias: 'right', factual: 'very-low' },
  'oann.com': { bias: 'right', factual: 'low' },
  'newsmax.com': { bias: 'right', factual: 'mixed' },
  'federalist.com': { bias: 'right', factual: 'mixed' },
  'theblaze.com': { bias: 'right', factual: 'mixed' },
  'westernjournal.com': { bias: 'right', factual: 'low' },
  'cnsnews.com': { bias: 'right', factual: 'mixed' },
  'dailysignal.com': { bias: 'right', factual: 'high' },
  'heritage.org': { bias: 'right', factual: 'high' },
  'americanthinker.com': { bias: 'right', factual: 'low' },
  'frontpagemag.com': { bias: 'right', factual: 'low' },
  'thegatewaypundit.com': { bias: 'right', factual: 'very-low' },
  'pjmedia.com': { bias: 'right', factual: 'low' },

  // Conspiracy / pseudoscience
  'naturalnews.com': { bias: 'conspiracy', factual: 'very-low' },
  'beforeitsnews.com': { bias: 'conspiracy', factual: 'very-low' },
  'zerohedge.com': { bias: 'right', factual: 'low' },
  'wakingtimes.com': { bias: 'conspiracy', factual: 'very-low' },
  'globalresearch.ca': { bias: 'conspiracy', factual: 'very-low' },
  'activistpost.com': { bias: 'conspiracy', factual: 'very-low' },
  'autismsciencefoundation.org': { bias: 'pro-science', factual: 'high' },
  'vaccineinjury.info': { bias: 'conspiracy', factual: 'very-low' },
  'vaxxed.com': { bias: 'conspiracy', factual: 'very-low' },
  'childrenshealthdefense.org': { bias: 'conspiracy', factual: 'very-low' },
  'healthfreedom.org': { bias: 'conspiracy', factual: 'low' },

  // Satire
  'theonion.com': { bias: 'satire', factual: 'low' },
  'babylonbee.com': { bias: 'satire', factual: 'low' },
  'clickhole.com': { bias: 'satire', factual: 'low' },

  // Academic / research (high credibility)
  'acm.org': { bias: 'pro-science', factual: 'very-high' },
  'ieee.org': { bias: 'pro-science', factual: 'very-high' },
  'nature.com': { bias: 'pro-science', factual: 'very-high' },
  'science.org': { bias: 'pro-science', factual: 'very-high' },
  'sciencedirect.com': { bias: 'pro-science', factual: 'very-high' },
  'springer.com': { bias: 'pro-science', factual: 'very-high' },
  'pubmed.ncbi.nlm.nih.gov': { bias: 'pro-science', factual: 'very-high' },
  'nih.gov': { bias: 'pro-science', factual: 'very-high' },
  'cdc.gov': { bias: 'pro-science', factual: 'very-high' },
  'who.int': { bias: 'pro-science', factual: 'very-high' },
  'nasa.gov': { bias: 'pro-science', factual: 'very-high' },
  'noaa.gov': { bias: 'pro-science', factual: 'very-high' },
  'cambridge.org': { bias: 'pro-science', factual: 'very-high' },
  'oxfordjournals.org': { bias: 'pro-science', factual: 'very-high' },
  'wiley.com': { bias: 'pro-science', factual: 'very-high' },
  'sagepub.com': { bias: 'pro-science', factual: 'very-high' },
  'tandfonline.com': { bias: 'pro-science', factual: 'very-high' },
  'arxiv.org': { bias: 'pro-science', factual: 'very-high' },

  // Government (.gov) — generally high credibility
  'usa.gov': { bias: 'center', factual: 'high' },
  'whitehouse.gov': { bias: 'center', factual: 'high' },
  'congress.gov': { bias: 'center', factual: 'very-high' },
  'supremecourt.gov': { bias: 'center', factual: 'very-high' },
  'fbi.gov': { bias: 'center', factual: 'high' },
  'justice.gov': { bias: 'center', factual: 'high' },
  'state.gov': { bias: 'center', factual: 'high' },
  'defense.gov': { bias: 'center', factual: 'high' },
  'energy.gov': { bias: 'pro-science', factual: 'high' },
  'fda.gov': { bias: 'pro-science', factual: 'very-high' },
  'epa.gov': { bias: 'pro-science', factual: 'high' },
  'usgs.gov': { bias: 'pro-science', factual: 'very-high' },

  // Educational (.edu) — high credibility
  'harvard.edu': { bias: 'pro-science', factual: 'very-high' },
  'mit.edu': { bias: 'pro-science', factual: 'very-high' },
  'stanford.edu': { bias: 'pro-science', factual: 'very-high' },
  'berkeley.edu': { bias: 'pro-science', factual: 'very-high' },
  'ox.ac.uk': { bias: 'pro-science', factual: 'very-high' },
  'cam.ac.uk': { bias: 'pro-science', factual: 'very-high' },
  'chop.edu': { bias: 'pro-science', factual: 'very-high' },

  // Health / medical
  'mayoclinic.org': { bias: 'pro-science', factual: 'very-high' },
  'clevelandclinic.org': { bias: 'pro-science', factual: 'very-high' },
  'hopkinsmedicine.org': { bias: 'pro-science', factual: 'very-high' },
  'webmd.com': { bias: 'center', factual: 'mixed' },
  'healthline.com': { bias: 'center', factual: 'mixed' },
  'medscape.com': { bias: 'pro-science', factual: 'high' },
  'everydayhealth.com': { bias: 'center', factual: 'mixed' },
  'verywellhealth.com': { bias: 'center', factual: 'high' },
  'goodrx.com': { bias: 'center', factual: 'mixed' },
  'drugs.com': { bias: 'pro-science', factual: 'high' },
  'pubmedhealth.com': { bias: 'pro-science', factual: 'very-high' },
  'autismspeaks.org': { bias: 'center', factual: 'high' },
  'kidshealth.org': { bias: 'pro-science', factual: 'high' },

  // Web platforms / reference
  'wikipedia.org': { bias: 'center', factual: 'high' },
  'reddit.com': { bias: 'center', factual: 'mixed' },
  'stackexchange.com': { bias: 'center', factual: 'high' },
  'stackoverflow.com': { bias: 'center', factual: 'high' },
  'quora.com': { bias: 'center', factual: 'mixed' },
  'github.com': { bias: 'center', factual: 'high' },
  'youtube.com': { bias: 'center', factual: 'mixed' },
  'twitter.com': { bias: 'center', factual: 'low' },
  'x.com': { bias: 'center', factual: 'low' },
  'facebook.com': { bias: 'center', factual: 'low' },
  'instagram.com': { bias: 'center', factual: 'low' },
  'tiktok.com': { bias: 'center', factual: 'low' },
  'linkedin.com': { bias: 'center', factual: 'mixed' },
  'medium.com': { bias: 'center', factual: 'mixed' },
  'substack.com': { bias: 'center', factual: 'mixed' },
  'wordpress.com': { bias: 'center', factual: 'mixed' },
  'blogger.com': { bias: 'center', factual: 'mixed' },
  'tumblr.com': { bias: 'center', factual: 'low' },
  'pinterest.com': { bias: 'center', factual: 'low' },

  // Tech / specialized
  'wired.com': { bias: 'left-center', factual: 'high' },
  'arstechnica.com': { bias: 'center', factual: 'high' },
  'theverge.com': { bias: 'left-center', factual: 'high' },
  'techcrunch.com': { bias: 'center', factual: 'high' },
  'zdnet.com': { bias: 'center', factual: 'high' },
  'cnet.com': { bias: 'center', factual: 'high' },
  'engadget.com': { bias: 'center', factual: 'high' },
  'scientificamerican.com': { bias: 'pro-science', factual: 'very-high' },
  'nationalgeographic.com': { bias: 'pro-science', factual: 'high' },
  'discovermagazine.com': { bias: 'pro-science', factual: 'high' },
  'popularmechanics.com': { bias: 'center', factual: 'high' },
  'popsci.com': { bias: 'center', factual: 'high' },
  // International
  'aljazeera.com': { bias: 'left-center', factual: 'high' },
  'france24.com': { bias: 'center', factual: 'high' },
  'dw.com': { bias: 'center', factual: 'high' },
  'channel4.com': { bias: 'center', factual: 'high' },
  'smh.com.au': { bias: 'center', factual: 'high' },
  'theage.com.au': { bias: 'center', factual: 'high' },
  'abc.net.au': { bias: 'center', factual: 'high' },
  'cbc.ca': { bias: 'center', factual: 'high' },
  'globeandmail.com': { bias: 'center', factual: 'high' },
  'scmp.com': { bias: 'center', factual: 'high' },
  'japantimes.co.jp': { bias: 'center', factual: 'high' },
  'timesofindia.indiatimes.com': { bias: 'center', factual: 'mixed' },
  'thehindu.com': { bias: 'left-center', factual: 'high' },
  'haaretz.com': { bias: 'left-center', factual: 'high' },
  'jpost.com': { bias: 'center', factual: 'high' },
  'lemonde.fr': { bias: 'center', factual: 'high' },
  'spiegel.de': { bias: 'center', factual: 'high' },
  'welt.de': { bias: 'center', factual: 'high' },

  // Fact-checking / watchdog
  'opensecrets.org': { bias: 'center', factual: 'very-high' },
  'sunlightfoundation.com': { bias: 'center', factual: 'high' },

  // Additional international & regional sources added 2025
  'kyivindependent.com': { bias: 'center', factual: 'high' },
  'ukrinform.ua': { bias: 'center', factual: 'mixed' },
  'europapress.es': { bias: 'center', factual: 'high' },
  'elpais.com': { bias: 'left-center', factual: 'high' },
  'elmundo.es': { bias: 'center', factual: 'high' },
  'corriere.it': { bias: 'center', factual: 'high' },
  'repubblica.it': { bias: 'left-center', factual: 'high' },
  'lefigaro.fr': { bias: 'right-center', factual: 'high' },
  'lesechos.fr': { bias: 'center', factual: 'high' },
  'sueddeutsche.de': { bias: 'left-center', factual: 'high' },
  'faz.net': { bias: 'right-center', factual: 'high' },
  'zeit.de': { bias: 'left-center', factual: 'high' },
  'nrc.nl': { bias: 'center', factual: 'high' },
  'volkskrant.nl': { bias: 'left-center', factual: 'high' },
  'thestar.com': { bias: 'center', factual: 'high' },
  'torontosun.com': { bias: 'right-center', factual: 'mixed' },
  'nationalpost.com': { bias: 'right-center', factual: 'high' },
  'ctvnews.ca': { bias: 'center', factual: 'high' },
  'straitstimes.com': { bias: 'center', factual: 'high' },
  'channelnewsasia.com': { bias: 'center', factual: 'high' },
  'nikkei.com': { bias: 'center', factual: 'high' },
  'asia.nikkei.com': { bias: 'center', factual: 'high' },
  'mainichi.jp': { bias: 'center', factual: 'high' },
  'asahi.com': { bias: 'left-center', factual: 'high' },
  'koreaherald.com': { bias: 'center', factual: 'high' },
  'koreatimes.co.kr': { bias: 'center', factual: 'high' },
  'donga.com': { bias: 'center', factual: 'high' },
  'indianexpress.com': { bias: 'center', factual: 'high' },
  'theprint.in': { bias: 'center', factual: 'high' },
  'scroll.in': { bias: 'left-center', factual: 'high' },
  'firstpost.com': { bias: 'right-center', factual: 'mixed' },
  'dailymaverick.co.za': { bias: 'center', factual: 'high' },
  'news24.com': { bias: 'center', factual: 'high' },
  'mg.co.za': { bias: 'left-center', factual: 'high' },
  'nation.africa': { bias: 'center', factual: 'high' },
  'punchng.com': { bias: 'center', factual: 'mixed' },
  'thecable.ng': { bias: 'center', factual: 'high' },
  'folhasp.com.br': { bias: 'left-center', factual: 'high' },
  'folha.uol.com.br': { bias: 'left-center', factual: 'high' },
  'oglobo.globo.com': { bias: 'center', factual: 'high' },
  'clarin.com': { bias: 'center', factual: 'mixed' },
  'lanacion.com.ar': { bias: 'center', factual: 'high' },
  'eluniversal.com.mx': { bias: 'center', factual: 'high' },
  'aristeguinoticias.com': { bias: 'left-center', factual: 'high' },

  // Additional academic / research
  'jstor.org': { bias: 'pro-science', factual: 'very-high' },
  'annualreviews.org': { bias: 'pro-science', factual: 'very-high' },
  'cell.com': { bias: 'pro-science', factual: 'very-high' },
  'thelancet.com': { bias: 'pro-science', factual: 'very-high' },
  'bmj.com': { bias: 'pro-science', factual: 'very-high' },
  'plos.org': { bias: 'pro-science', factual: 'very-high' },
  'frontiersin.org': { bias: 'pro-science', factual: 'high' },
  'mdpi.com': { bias: 'pro-science', factual: 'mixed' },
  'hindawi.com': { bias: 'pro-science', factual: 'mixed' },
  'peerj.com': { bias: 'pro-science', factual: 'high' },
  'researchgate.net': { bias: 'pro-science', factual: 'mixed' },
  'semanticscholar.org': { bias: 'pro-science', factual: 'high' },

  // Additional government / policy
  'cbo.gov': { bias: 'center', factual: 'very-high' },
  'gao.gov': { bias: 'center', factual: 'very-high' },
  'oig.nasa.gov': { bias: 'center', factual: 'very-high' },
  'nationalacademies.org': { bias: 'pro-science', factual: 'very-high' },
  'rand.org': { bias: 'center', factual: 'very-high' },
  'brookings.edu': { bias: 'center', factual: 'very-high' },
  'aei.org': { bias: 'right-center', factual: 'high' },
  'cato.org': { bias: 'right-center', factual: 'high' },
  'urban.org': { bias: 'left-center', factual: 'high' },
  'pewresearch.org': { bias: 'center', factual: 'very-high' },
  'gallup.com': { bias: 'center', factual: 'very-high' },

  // Additional tech & specialized
  'mitpress.mit.edu': { bias: 'pro-science', factual: 'very-high' },
  'technologyreview.com': { bias: 'pro-science', factual: 'very-high' },
  'newscientist.com': { bias: 'pro-science', factual: 'high' },
  'quantamagazine.org': { bias: 'pro-science', factual: 'very-high' },
  'ourworldindata.org': { bias: 'pro-science', factual: 'very-high' },
  'gapminder.org': { bias: 'pro-science', factual: 'high' },
  'statista.com': { bias: 'center', factual: 'high' },
  'axios.com': { bias: 'center', factual: 'high' },
  'semafor.com': { bias: 'center', factual: 'high' },
  'theintercept.com': { bias: 'left-center', factual: 'high' },
  'buzzfeednews.com': { bias: 'left-center', factual: 'mixed' },
  'vice.com': { bias: 'left-center', factual: 'mixed' },
  'thebulwark.com': { bias: 'left-center', factual: 'high' },
  'dispatch.com': { bias: 'center', factual: 'high' },
  'noahpinion.substack.com': { bias: 'center', factual: 'mixed' },
  'astralcodexten.substack.com': { bias: 'center', factual: 'high' },
  'worksinprogress.co': { bias: 'center', factual: 'high' },

  // Additional health
  'nhs.uk': { bias: 'pro-science', factual: 'very-high' },
  'health.harvard.edu': { bias: 'pro-science', factual: 'very-high' },
  'medpagetoday.com': { bias: 'pro-science', factual: 'high' },
  'statnews.com': { bias: 'pro-science', factual: 'high' },
  'nejm.org': { bias: 'pro-science', factual: 'very-high' },
  'psychiatryonline.org': { bias: 'pro-science', factual: 'very-high' },
  'apa.org': { bias: 'pro-science', factual: 'very-high' },
  'sciencebasedmedicine.org': { bias: 'pro-science', factual: 'very-high' },
  'quackwatch.org': { bias: 'pro-science', factual: 'very-high' },
};

function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return url.toLowerCase().replace(/^www\./, '');
  }
}

export function lookupDomain(url: string): DomainEntry | null {
  const domain = extractDomain(url);
  let entry = domainData[domain];
  if (entry) return entry;
  const parent = domain.split('.').slice(-2).join('.');
  entry = domainData[parent];
  if (entry) return entry;

  if (domain.endsWith('.edu')) return { bias: 'pro-science', factual: 'very-high' };
  if (domain.endsWith('.gov')) return { bias: 'center', factual: 'high' };
  if (domain.endsWith('.mil')) return { bias: 'center', factual: 'high' };

  return null;
}

export function factualToScore(factual: Factual): number {
  const map: Record<Factual, number> = {
    'very-high': 10,
    'high': 8,
    'mixed': 5,
    'low': 3,
    'very-low': 1,
  };
  return map[factual] ?? 5;
}

export function biasToBiasScore(bias: Bias): number {
  const map: Record<Bias, number> = {
    'pro-science': 0.05,
    'center': 0.1,
    'left-center': 0.2,
    'right-center': 0.2,
    'left': 0.4,
    'right': 0.4,
    'conspiracy': 0.7,
    'satire': 0.6,
  };
  return map[bias] ?? 0.3;
}

export function biasToTrendLabel(bias: Bias): 'up' | 'down' | 'stable' {
  if (bias === 'pro-science' || bias === 'center') return 'up';
  if (bias === 'left-center' || bias === 'right-center') return 'stable';
  return 'down';
}

export function credibilityTrendFromHistory(history: number[]): 'up' | 'down' | 'stable' {
  if (history.length < 2) return 'stable';
  const recent = history.slice(-3);
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const prev = history.slice(0, -3);
  const prevAvg = prev.length > 0 ? prev.reduce((a, b) => a + b, 0) / prev.length : avg;
  const diff = avg - prevAvg;
  if (diff > 0.3) return 'up';
  if (diff < -0.3) return 'down';
  return 'stable';
}
