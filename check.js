const puppeteer = require('puppeteer');
const ExcelJS = require('exceljs');
const fs = require('fs').promises;
const path = require('path');
const dns = require('dns').promises;

// Color constants
const STATUS_COLORS = {
    COMPLETE: 'FF90EE90',    // Light Green - All contact info present
    PARTIAL: 'FFFFD700',     // Gold - Some contact info present
    NONE: 'FFFF6B6B',       // Light Red - No contact info
    ERROR: 'FFFF0000'       // Red - Site error
};

class ContactScraper {
    constructor(options = {}) {
        this.options = {
            outputFile: 'contacts.xlsx',
            timeout: 20000,
            maxRetries: 3,
            chromePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            ...options
        };
    }

    async extractFooterContacts(page) {
        try {
            return await page.evaluate(() => {
                const extractText = (selector) => {
                    const element = document.querySelector(selector);
                    return element ? element.textContent.trim() : '';
                };

                // Find contact information containers
                const containers = Array.from(document.querySelectorAll('.text-white.flex.flex-col.grow div'));
                
                let contacts = {
                    address: '',
                    hours: '',
                    phone: '',
                    email: ''
                };

                containers.forEach(container => {
                    const text = container.textContent.trim();
                    
                    // Check content type and extract accordingly
                    if (text.includes('Lantai') || text.includes('Jalan') || text.includes('Jl.')) {
                        contacts.address = text;
                    }
                    else if (text.match(/\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/)) {
                        contacts.hours = text;
                    }
                    else if (text.match(/\d{10,}/)) {
                        contacts.phone = text;
                    }
                    else if (text.includes('@')) {
                        contacts.email = text;
                    }
                });

                return contacts;
            });
        } catch (error) {
            console.error('Error extracting footer contacts:', error);
            return null;
        }
    }

    async extractContacts(page, url) {
        try {
            // Check domain availability
            const isDomainAvailable = await this.checkDomain(url);
            if (!isDomainAvailable) {
                return this.createResult(url, 'DNS Error - Domain not found');
            }

            // Navigate to page
            const response = await page.goto(url, {
                waitUntil: 'networkidle0',
                timeout: this.options.timeout
            });

            if (!response.ok()) {
                return this.createResult(url, `HTTP Error ${response.status()}`);
            }

            // Extract footer contacts
            const footerContacts = await this.extractFooterContacts(page);
            
            if (!footerContacts) {
                return this.createResult(url, 'Error extracting contacts');
            }

            return this.createResult(url, 'success', footerContacts);

        } catch (error) {
            const status = error.name === 'TimeoutError' 
                ? 'Timeout - Response took too long'
                : `Error: ${error.message}`;
            return this.createResult(url, status);
        }
    }

    async checkDomain(url) {
        try {
            const hostname = new URL(url).hostname;
            await dns.lookup(hostname);
            return true;
        } catch {
            return false;
        }
    }

    determineStatus(contacts) {
        if (!contacts) return STATUS_COLORS.ERROR;
        
        const hasInfo = Object.values(contacts).some(value => value !== '');
        const allInfo = Object.values(contacts).every(value => value !== '');
        
        if (allInfo) return STATUS_COLORS.COMPLETE;
        if (hasInfo) return STATUS_COLORS.PARTIAL;
        return STATUS_COLORS.NONE;
    }

    createResult(url, status, contacts = null) {
        const colorCode = contacts ? this.determineStatus(contacts) : STATUS_COLORS.ERROR;
        
        return {
            url,
            address: contacts?.address || '',
            hours: contacts?.hours || '',
            phone: contacts?.phone || '',
            email: contacts?.email || '',
            status,
            colorCode
        };
    }

    async saveToExcel(results) {
        const filePath = path.join(process.cwd(), this.options.outputFile);

        try {
            // Create new workbook
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Contacts');

            // Configure columns
            worksheet.columns = [
                { header: 'URL', key: 'url', width: 40 },
                { header: 'Address', key: 'address', width: 50 },
                { header: 'Operating Hours', key: 'hours', width: 20 },
                { header: 'Phone', key: 'phone', width: 20 },
                { header: 'Email', key: 'email', width: 30 },
                { header: 'Status', key: 'status', width: 20 }
            ];

            // Style header row
            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true };

            // Add and style data rows
            results.forEach(result => {
                const row = worksheet.addRow(result);
                row.eachCell(cell => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: result.colorCode }
                    };
                });
            });

            await workbook.xlsx.writeFile(this.options.outputFile);
            console.log('Excel file created successfully:', this.options.outputFile);

        } catch (error) {
            console.error('Error saving Excel file:', error);
            throw error;
        }
    }

    async scrapeUrls(urls) {
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            executablePath: this.options.chromePath
        });

        try {
            const page = await browser.newPage();
            page.setDefaultTimeout(this.options.timeout);

            const results = [];
            for (const url of urls) {
                console.log(`Processing: ${url}`);
                const result = await this.extractContacts(page, url);
                results.push(result);
            }

            await this.saveToExcel(results);
            return results;

        } finally {
            await browser.close();
        }
    }
}

// Usage example
const scraper = new ContactScraper({
    outputFile: 'website_contacts2.xlsx',
    timeout: 30000
});

const urls = [
    'https://99pay.wlabel.id/',
'https://a3reload.wlabel.id/',
'https://adfinaz.wlabel.id/',
'https://albyqianpulsa.wlabel.id/',
'https://alfathan.wlabel.id/',
'https://alfatthreload.wlabel.id/',
'https://almarismediapay.wlabel.id/',
'https://ancala14.wlabel.id/',
'https://anterolink.wlabel.id/',
'https://arenagamers.wlabel.id/',
'https://armaone.wlabel.id/',
'https://askanapay.wlabel.id/',
'https://azzamdigitalnetwork.wlabel.id/',
'https://bangblackstore.wlabel.id/',
'https://benstore.wlabel.id/',
'https://berlianjayateknologi.wlabel.id/',
'https://bintang.wlabel.id/',
'https://bngamestore.wlabel.id/',
'https://butikpulsa.wlabel.id/',
'https://cendrawasihwanek.wlabel.id/',
'https://cesiatronik.wlabel.id/',
'https://chatarsispulsa.wlabel.id/',
'https://chinmonshop.wlabel.id/',
'https://cloverblissful.wlabel.id/',
'https://dagangpulsa.wlabel.id/',
'https://dciserver.wlabel.id/',
'https://dempo.wlabel.id/',
'https://devinareload.wlabel.id/',
'https://dewostore.wlabel.id/',
'https://digiprosb.wlabel.id/',
'https://digitaldistribusi.wlabel.id/',
'https://digitamapay.wlabel.id/',
'https://ekopulsa.wlabel.id/',
'https://endpay.wlabel.id/',
'',
'https://exopph2h.wlabel.id/',
'https://exuindo.wlabel.id/',
'https://fahminet.wlabel.id/',
'https://firmanstore.wlabel.id/',
'https://fjpulsa.wlabel.id/',
'https://flazzsignal.wlabel.id/',
'https://galaxydigital.wlabel.id/',
'https://giznet.wlabel.id/',
'https://gudangpulsa.wlabel.id/',
'https://h2hgadget.wlabel.id/',
'https://happiereload.wlabel.id/',
'https://heriantopulsa.wlabel.id/',
'https://hijrahpulsa.wlabel.id/',
'https://ikfipayment.wlabel.id/',
'https://irjenpulsa.wlabel.id/',
'https://johnsontopup.wlabel.id/',
'https://jspaypulsa.wlabel.id/',
'https://kashdigital.wlabel.id/',
'https://kawanreload.wlabel.id/',
'https://koneksi.wlabel.id/',
'https://konterpulsa.wlabel.id/',
'https://kruactivereload.wlabel.id/',
'https://kuotapulsa.wlabel.id/',
'https://kystore.wlabel.id/',
'https://melinda.wlabel.id/',
'https://mfreload.wlabel.id/',
'https://miraclegaming.wlabel.id/',
'https://mitrakusumahdinata.wlabel.id/',
'https://mitrapulsa.wlabel.id/',
'https://moonpay.wlabel.id/',
'https://moustore.wlabel.id/',
'https://mrakhtronik.wlabel.id/',
'https://mtcell.wlabel.id/',
'https://mumtazshop.wlabel.id/',
'https://murago.wlabel.id/',
'https://murah1kuota.wlabel.id/',
'https://mutia45.wlabel.id/',
'https://myasmat.wlabel.id/',
'https://natasyareload.wlabel.id/',
'https://nj.wlabel.id/',
'https://nwsevenpay.wlabel.id/',
'https://pintulangit.wlabel.id/',
'https://planetreload.wlabel.id/',
'https://portaljupa.wlabel.id/',
'https://priangandigital.wlabel.id/',
'https://pronesiago.wlabel.id/',
'https://pulsajuara.wlabel.id/',
'https://regencypayment.wlabel.id/',
'https://rekantopup.wlabel.id/',
'https://repay.wlabel.id/',
'https://resikaputri.wlabel.id/',
'https://rezpay.wlabel.id/',
'https://rhspaymentsystem.wlabel.id/',
'https://rinata.wlabel.id/',
'https://rumahpulsa.wlabel.id/',
'https://safapulsa.wlabel.id/',
'https://saldogampang.wlabel.id/',
'https://scatterpayment.wlabel.id/',
'https://serdapul.wlabel.id/',
'https://serverpulsamurah.wlabel.id/',
'https://sgroupteknologi.wlabel.id/',
'https://smreload.wlabel.id/',
'https://sobatpayment.wlabel.id/',
'https://speed3cell.wlabel.id/',
'https://sugihpulsa.wlabel.id/',
'https://syacho.wlabel.id/',
'https://taradigitalindonesia.wlabel.id/',
'https://teknopulsa.wlabel.id/',
'https://tifa.wlabel.id/',
'https://tokonavi.wlabel.id/',
'https://top1reload.wlabel.id/',
'https://trepulsa.wlabel.id/',
'https://tubaba.wlabel.id/',
'https://tukuae.wlabel.id/',
'https://vinsstore.wlabel.id/',
'https://wicitrapulsa.wlabel.id/',
'https://wikiki.wlabel.id/',
'https://wirmaypulsa.wlabel.id/',
'https://xnrteam.wlabel.id/',
'https://zalfacell.wlabel.id/'

];

scraper.scrapeUrls(urls)
    .then(() => console.log('Scraping completed successfully'))
    .catch(error => console.error('Scraping failed:', error));