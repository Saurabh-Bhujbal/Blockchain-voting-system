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
        
        // Replace single quotes
        content = content.replace(/'http:\/\/192\.168\.137\.1:8000/g, "`http://" + dynamicIp + ":8000");
        // Replace backticks
        content = content.replace(/`http:\/\/192\.168\.137\.1:8000/g, "`http://" + dynamicIp + ":8000");
        // Replace double quotes
        content = content.replace(/"http:\/\/192\.168\.137\.1:8000/g, "`http://" + dynamicIp + ":8000");
        
        // Also do it for blockchain port 7545 and 9545
        content = content.replace(/"http:\/\/192\.168\.137\.1:7545/g, "`http://" + dynamicIp + ":7545");
        content = content.replace(/"http:\/\/192\.168\.137\.1:9545/g, "`http://" + dynamicIp + ":9545");
        
        if (content !== original) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log("Updated", filePath);
        }
    }
});
