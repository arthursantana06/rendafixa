const fs = require('fs');
const Papa = require('papaparse');

const file = fs.readFileSync('csv/informacoes-de-capital.csv', 'latin1');
Papa.parse(file, {
  delimiter: ';',
  skipEmptyLines: true,
  complete: (results) => {
    let headerIndex = -1;
    for (let i = 0; i < Math.min(10, results.data.length); i++) {
      const row = results.data[i];
      if (row.includes('Instituição') || row.includes('Código') || row.includes('SR')) {
        headerIndex = i;
        break;
      }
    }

    if (headerIndex === -1) {
      console.log('No header found');
      return;
    }

    const headers = results.data[headerIndex];
    console.log('headerIndex:', headerIndex);
    const codigoIdx = headers.indexOf('Código');
    console.log('codigoIdx:', codigoIdx);

    const parsedData = [];
    for (let i = headerIndex + 1; i < results.data.length; i++) {
      const rowArray = results.data[i];
      
      if (codigoIdx === -1) continue;
      
      const codigoVal = rowArray[codigoIdx];
      if (!codigoVal || !/^\d+$/.test(codigoVal.trim())) {
         continue;
      }

      const rowObj = {};
      headers.forEach((h, idx) => {
        const safeH = h ? h.trim() : `Unnamed_${idx}`;
        if (!rowObj[safeH] && safeH !== '') {
          rowObj[safeH] = rowArray[idx];
        }
      });
      parsedData.push(rowObj);
    }

    console.log('Parsed rows:', parsedData.length);
    if (parsedData.length > 0) {
      console.log('First row Código:', parsedData[0]['Código']);
      console.log('First row Instituição:', parsedData[0]['Instituição']);
    }
  }
});
