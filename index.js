const puppeteer = require('puppeteer');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// Definisi warna untuk berbagai kondisi
const COLORS = {
    TELEGRAM_ONLY: 'FF0000FF', // Biru
    WHATSAPP_ONLY: 'FF00FF00', // Hijau
    BOTH: 'FF800080',          // Ungu
    NONE: 'FFFF0000'           // Merah
};

const urls = [
    'https://loket-ku.com',
    'https://agenpulsamurahmm.com',
    'https://webpulsa.com',
    'https://watop.xyz',
    'https://vnet.co.id',
    'https://castoredigital.com',
    'https://toppayserver.com',
    'https://mitrapintar.com',
    'https://sakudigital.id',
    'https://damarteknomedia.com',
    'https://revolttopup.com',
    'https://qiosalifapay.com',
    'https://zonah2h.my.id',
    'https://twoflazz.com',
    'https://nanomobile.net',
    'https://rumahreload.net',
    'https://haazalink.id',
    'https://tokohanif.com',
    'https://haazalink.com',
    'https://fanspulsa.net',
    'https://agstore.id',
];

function determineColor(whatsapp, telegram) {
    if (whatsapp && telegram) return COLORS.BOTH;
    if (telegram && !whatsapp) return COLORS.TELEGRAM_ONLY;
    if (whatsapp && !telegram) return COLORS.WHATSAPP_ONLY;
    return COLORS.NONE;
}

async function scrapeContact(page, url) {
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    try {
        await page.goto(fullUrl, { waitUntil: 'networkidle0', timeout: 30000 });
        
        // Cek apakah element #menu-share ada
        const shareButtonExists = await page.evaluate(() => {
            return !!document.querySelector('#menu-share');
        });

        let contacts;
        if (!shareButtonExists) {
            // Coba cari link kontak langsung dari halaman
            contacts = await page.evaluate(() => {
                const links = document.querySelectorAll('a');
                let whatsapp = '';
                let telegram = '';

                links.forEach(link => {
                    const href = link.getAttribute('href') || '';
                    if (href.includes('whatsapp.com/send?phone=')) {
                        const phone = href.match(/phone=(\d+)/);
                        if (phone && phone[1].startsWith('62') && phone[1].length > 10) {
                            whatsapp = phone[1];
                        }
                    } else if (href.includes('t.me/')) {
                        const username = href.replace('https://t.me/', '');
                        if (username && username !== '') {
                            telegram = `https://t.me/@${username}`;
                        }
                    }
                });

                return { whatsapp, telegram };
            });
        } else {
            await page.click('#menu-share');
            await page.waitForSelector('.ul .li a', { timeout: 5000 });

            contacts = await page.evaluate(() => {
                const links = document.querySelectorAll('.ul .li a');
                let whatsapp = '';
                let telegram = '';

                links.forEach(link => {
                    const href = link.getAttribute('href');
                    if (href.includes('whatsapp.com/send?phone=')) {
                        const phone = href.match(/phone=(\d+)/);
                        if (phone && phone[1].startsWith('62') && phone[1].length > 10) {
                            whatsapp = phone[1];
                        }
                    } else if (href.includes('t.me/')) {
                        const username = href.replace('https://t.me/', '');
                        if (username && username !== '') {
                            telegram = `https://t.me/@${username}`;
                        }
                    }
                });

                return { whatsapp, telegram };
            });
        }

        const colorCode = determineColor(contacts.whatsapp, contacts.telegram);

        return {
            url,
            whatsapp: contacts.whatsapp || '',
            telegram: contacts.telegram || '',
            status: shareButtonExists ? 'success' : 'no-share-button',
            colorCode
        };

    } catch (error) {
        console.error(`Error pada ${url}:`, error.message);
        return {
            url,
            whatsapp: '',
            telegram: '',
            status: 'failed',
            colorCode: COLORS.NONE
        };
    }
}

async function saveToExcel(results, retryCount = 0) {
    const maxRetries = 3;
    const fileName = 'data-baru.xlsx';
    const filePath = path.join(process.cwd(), fileName);

    try {
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (err) {
                if (retryCount < maxRetries) {
                    console.log(`File sedang digunakan, mencoba lagi dalam 2 detik... (Percobaan ${retryCount + 1})`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    return saveToExcel(results, retryCount + 1);
                } else {
                    throw new Error('Tidak bisa menyimpan file Excel. Pastikan file tidak sedang dibuka.');
                }
            }
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Contacts');

        worksheet.columns = [
            { header: 'URL', key: 'url', width: 40 },
            { header: 'WhatsApp', key: 'whatsapp', width: 20 },
            { header: 'Telegram', key: 'telegram', width: 40 },
            { header: 'Status', key: 'status', width: 15 }
        ];

        // Style header
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };

        results.forEach((result) => {
            const row = worksheet.addRow({
                url: result.url,
                whatsapp: result.whatsapp,
                telegram: result.telegram,
                status: result.status
            });

            // Terapkan warna background sesuai kondisi
            row.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: result.colorCode }
                };
            });
        });

        await workbook.xlsx.writeFile(fileName);
        console.log('File Excel berhasil dibuat:', fileName);
    } catch (error) {
        console.error('Error saat menyimpan file Excel:', error.message);
        if (retryCount < maxRetries) {
            console.log(`Mencoba lagi dalam 2 detik... (Percobaan ${retryCount + 1})`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return saveToExcel(results, retryCount + 1);
        } else {
            throw error;
        }
    }
}

async function main() {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        product: 'chrome'
    });

    const results = [];
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);

    for (const url of urls) {
        console.log(`Memproses: ${url}`);
        const result = await scrapeContact(page, url);
        results.push(result);
    }

    await browser.close();
    await saveToExcel(results);
}

main().catch(console.error);