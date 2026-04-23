const puppeteer = require('puppeteer');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Capture page errors and console messages
  page.on('pageerror', err => {
    console.error('PAGE ERROR:', err.message);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('CONSOLE ERROR:', msg.text());
    } else {
      console.log('CONSOLE:', msg.text());
    }
  });

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  console.log('Clicking the first archive item...');
  // Find an element with class that matches the archive items
  const clicked = await page.evaluate(() => {
    // Look for group cursor-pointer
    const items = document.querySelectorAll('.group.cursor-pointer');
    if (items.length > 0) {
      items[0].click();
      return true;
    }
    return false;
  });

  if (clicked) {
    console.log('Item clicked. Waiting to see if there are errors...');
    await new Promise(r => setTimeout(r, 2000));
  } else {
    console.log('No archive items found. LocalStorage might be empty.');
    // Let's create an item in localStorage
    const sampleState = {
      state: {
        archive: [
          {
            id: "123",
            query: "Test query",
            timestamp: new Date().toISOString(),
            topic_cluster: "Test Cluster",
            tags: [],
            summary_snippet: "Snippet",
            report: {
              query_understood: "Test query",
              mode: "standard",
              geo_triggered: false,
              timeline_triggered: false,
              summary: {
                bottom_line: "Bottom line",
                full_synthesis: "Synthesis"
              }
            }
          }
        ]
      }
    };
    await page.evaluate((state) => {
      localStorage.setItem('aria-storage', JSON.stringify(state));
    }, sampleState);
    console.log('Reloading with fake data...');
    await page.reload({ waitUntil: 'networkidle2' });
    const clicked2 = await page.evaluate(() => {
      const items = document.querySelectorAll('.group.cursor-pointer');
      if (items.length > 0) {
        items[0].click();
        return true;
      }
      return false;
    });
    if (clicked2) {
      console.log('Item clicked. Waiting to see if there are errors...');
      await new Promise(r => setTimeout(r, 2000));
    } else {
      console.log('Still no items found.');
    }
  }

  await browser.close();
  console.log('Done.');
})();
