const fs = require('fs');
const { PDFParse } = require('pdf-parse');

const dataBuffer = fs.readFileSync('/tmp/menu.pdf');

PDFParse(dataBuffer).then(function(data) {
    console.log('==== PDF TEXT CONTENT ====');
    console.log(data.text);
    console.log('==== END PDF CONTENT ====');
    console.log(`\nPages: ${data.numpages}`);
    console.log(`Info:`, JSON.stringify(data.info, null, 2));
}).catch(err => {
    console.error('Error parsing PDF:', err.message);
    process.exit(1);
});
