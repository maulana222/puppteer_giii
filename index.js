const puppeteer = require('puppeteer');

(async () => {
  // Membuka browser
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 
    headless: false, // Set true jika ingin menjalankan browser tanpa antarmuka grafis (headless)
    // headless: 'new'
});

  const page = await browser.newPage();

  await page.goto('https://www.google.com/');

  await page.type("body > div.L3eUgb > div.o3j99.ikrT4e.om7nvf > form > div:nth-child(1) > div.A8SBwf > div.RNNXgb > div > div.a4bIc", 
  'apa itu ikan asin',
  {delat: 1500}
  );

  // const textareaSelector = '#prompt-textarea';

  // await page.type(textareaSelector, 'Ini adalah teks yang akan diketikkan.');

  // await page.waitForTimeout(2000);

  // await browser.close();
});