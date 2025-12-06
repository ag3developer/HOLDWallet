const https = require('https');
const fs = require('fs');
const path = require('path');

// Criar diretório na pasta public para Vite servir os assets estáticos
const iconDir = path.join(__dirname, '..', 'public', 'crypto-icons');
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

// URL base do repositório
const BASE_URL = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color';

// Lista de criptomoedas para baixar
const cryptos = [
  'btc',    // Bitcoin
  'eth',    // Ethereum
  'usdt',   // Tether
  'usdc',   // USD Coin
  'bnb',    // Binance Coin
  'matic',  // Polygon
  'trx',    // Tron
  'sol',    // Solana
  'ltc',    // Litecoin
  'doge',   // Dogecoin
  'ada',    // Cardano
  'avax',   // Avalanche
  'dot',    // Polkadot
  'link',   // Chainlink
  'shib',   // Shiba Inu
  'xrp',    // Ripple
  'dai',    // Dai
  'busd',   // Binance USD
];

console.log('📦 Baixando ícones de criptomoedas...\n');
console.log(`📁 Salvando em: ${iconDir}\n`);

let completed = 0;
let succeeded = 0;
let failed = 0;

function downloadIcon(crypto) {
  return new Promise((resolve) => {
    const url = `${BASE_URL}/${crypto}.svg`;
    const filePath = path.join(iconDir, `${crypto}.svg`);

    const request = https.get(url, (response) => {
      if (response.statusCode === 200) {
        const fileStream = fs.createWriteStream(filePath);
        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          console.log(`✅ ${crypto}.svg baixado com sucesso`);
          succeeded++;
          resolve(true);
        });

        fileStream.on('error', (err) => {
          console.log(`❌ Erro ao salvar ${crypto}.svg: ${err.message}`);
          failed++;
          resolve(false);
        });
      } else if (response.statusCode === 301 || response.statusCode === 302) {
        // Seguir redirecionamento
        const redirectUrl = response.headers.location;
        console.log(`🔄 Redirecionando ${crypto}.svg...`);
        https.get(redirectUrl, (redirectResponse) => {
          const fileStream = fs.createWriteStream(filePath);
          redirectResponse.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close();
            console.log(`✅ ${crypto}.svg baixado com sucesso`);
            succeeded++;
            resolve(true);
          });
        });
      } else {
        console.log(`❌ Erro ao baixar ${crypto}.svg (Status: ${response.statusCode})`);
        failed++;
        resolve(false);
      }
    });

    request.on('error', (err) => {
      console.log(`❌ Erro ao baixar ${crypto}.svg: ${err.message}`);
      failed++;
      resolve(false);
    });

    request.setTimeout(10000, () => {
      console.log(`⏱️ Timeout ao baixar ${crypto}.svg`);
      request.destroy();
      failed++;
      resolve(false);
    });
  });
}

// Baixar sequencialmente para evitar problemas
async function downloadAll() {
  for (const crypto of cryptos) {
    await downloadIcon(crypto);
    completed++;
  }
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🎉 Download concluído!`);
  console.log(`📊 Resumo: ${succeeded} sucesso, ${failed} falhas de ${cryptos.length} total`);
  console.log(`📁 Ícones salvos em: ${iconDir}`);
  console.log(`${'='.repeat(50)}\n`);
}

downloadAll();
