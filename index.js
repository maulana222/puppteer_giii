const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({headless: false});
  const page = await browser.newPage();

  await page.goto('https://5a33-116-206-9-16.ngrok-free.app/'); 

  await page.waitForTimeout(1000);
  
  await page.click('button');
  
  // await page.waitForTimeout(1000);
  await page.type("#username",
  'maulana ergi',
  )
  await page.click('button'); 
  
  // await page.waitForTimeout(1000);
    await page.type("#message-input",
    'hello apakabar'
    )
    await page.click('#send-message'); 

 
  await page.waitForTimeout(10000);

  await browser.close();
})();

