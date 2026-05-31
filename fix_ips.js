const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

const dynamicIp = "${window.location.hostname === '192.168.137.1' ? '192.168.137.1' : '127.0.0.1'}";

walkDir('src', function(filePath) {
    if (filePath.endsWith('.js') || filePath.endsWith('.html')) {
        if (filePath.includes('app.bundle.js') || filePath.includes('login.bundle.js')) return;
        
        let content = fs.readFileSync(filePath, 'utf8');
        let original = content;
        
        // Find 'http://192.168.137.1:8000...' and convert to `http://${dynamicIp}:8000...`
        // We match the opening quote, the IP, and all the way to the closing quote.
        // E.g. 'http://192.168.137.1:8000/register' -> `http://${dynamicIp}:8000/register`
        
        content = content.replace(/(['"`])http:\/\/192\.168\.137\.1:(8000|7545|8545|9545)(.*?)(['"`])/g, function(match, openQ, port, rest, closeQ) {
            // Replace the entire string literal with a template literal.
            // But wait, if it's already a template literal and has variables like ${voter_id}, it should stay a template literal!
            return '`http://' + dynamicIp + ':' + port + rest + '`';
        });
        
        if (content !== original) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log("Updated", filePath);
        }
    }
});
