'use strict';

const { parse } = require('csv-parse');
const fs = require('fs');
const logger = require('./logger');

function parseCsv(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];

    const parser = fs.createReadStream(filePath).pipe(
      parse({
        columns: true,           
        skip_empty_lines: true,
        trim: true,              
        relax_column_count: true, 
        bom: true,               
      }),
    );

    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        rows.push(record);
      }
    });

    parser.on('error', (err) => {
      logger.error(`CSV parse error for file ${filePath}: ${err.message}`);
      reject(err);
    });

    parser.on('end', () => {
      logger.info(`Parsed ${rows.length} rows from ${filePath}`);
      resolve(rows);
    });
  });
}

module.exports = { parseCsv };
