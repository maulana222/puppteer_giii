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
    outputFile: 'website_contacts3.xlsx',
    timeout: 30000
});

const urls = [
    
    'https://waroengonlinekupang.com',
    'https://griyapulsa.web.id',
    'https://bambupulsa.com',
    'https://haazalink.id',
    'https://pulsasoris.com',
    'https://klopp.id',
    'https://fastproses.com',
    'https://miuwstore.com',
    'https://igrapay.com',
    'https://kiosdempo.com',
    'https://kafa-payment.com',
    'https://bumora.id',
    'https://izipay.co.id',
    'https://lokerpay.com',
    'https://paypas.id',
    'https://cjsyourlifeneeds.com',
    'https://toyomart.id',
    'https://bilhuda.id',
    'https://aslipay.id',
    'https://pulsaxpress.com ',
    'https://digitoko.id',
    'https://3dara.store',
    'https://mayumi-pulsa.com',
    'https://desapay.id',
    'https://toppaymobile.online',
    'https://wilkonter.net',
    'https://kshop.web.id',
    'https://dar-reload.com',
    'https://eonpay.my.id',
    'https://wepay.id',
    'https://sesnesiareload.com',
    'https://gopayu.my.id',
    'https://kedailayanandigital.com',
    'https://ratubopulsa.com',
    'https://wl-demo.id',
    'https://erikabooksmediaonline.com',
    'https://resdaagenpulsa.com',
    'https://agenppulsa.my.id',
    'https://mitrapulsa.cloud',
    'https://bellipulsa.com',
    'https://xnrena.com',
    'https://pospulsa.id',
    'https://benefitkuotamurah.com',
    'https://bayarmantap.com',
    'https://rinata.id',
    'https://pebimedia.com',
    'https://pulsana.id',
];

scraper.scrapeUrls(urls)
    .then(() => console.log('Scraping completed successfully'))
    .catch(error => console.error('Scraping failed:', error));