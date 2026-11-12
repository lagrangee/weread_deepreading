const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');

const output = path.resolve(__dirname, '../assets/promotion/deepreading-app-store.png');
fs.mkdirSync(path.dirname(output), { recursive: true });
QRCode.toFile(output, 'https://apps.apple.com/app/id6827442865', {
  width: 256,
  margin: 4,
  errorCorrectionLevel: 'M',
}).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
