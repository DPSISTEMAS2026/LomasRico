
const fs = require('fs');
const path = require('path');

async function parseExcel() {
    const sharedStringsPath = 'd:\\PRODUCCION-LO-MAS-RICO-V3\\temp_menu\\xl\\sharedStrings.xml';
    const sheetPath = 'd:\\PRODUCCION-LO-MAS-RICO-V3\\temp_menu\\xl\\worksheets\\sheet1.xml';

    const sharedStringsContent = fs.readFileSync(sharedStringsPath, 'utf8');
    const sheetContent = fs.readFileSync(sheetPath, 'utf8');

    // 1. Parse Shared Strings
    // Simple regex to capture <t>...</t> content. 
    // Note: <si> can contain multiple <t> or <r><t>...
    const strings = [];
    const siRegex = /<si>(.*?)<\/si>/g;
    let match;
    while ((match = siRegex.exec(sharedStringsContent)) !== null) {
        const inner = match[1];
        // Extract all text content
        const tRegex = /<t[^>]*>(.*?)<\/t>/g;
        let text = '';
        let tMatch;
        while ((tMatch = tRegex.exec(inner)) !== null) {
            text += tMatch[1];
        }
        strings.push(text);
    }

    console.log(`Found ${strings.length} shared strings.`);

    // 2. Parse Sheet Rows
    const rows = [];
    const rowRegex = /<row r="(\d+)"[^>]*>(.*?)<\/row>/g;
    while ((match = rowRegex.exec(sheetContent)) !== null) {
        const rowNum = match[1];
        const rowContent = match[2];
        const cells = {};

        const cRegex = /<c r="([A-Z]+)(\d+)"(?:[^>]*t="([a-z]+)")?[^>]*>(?:<v>(.*?)<\/v>)?<\/c>/g;
        let cMatch;
        while ((cMatch = cRegex.exec(rowContent)) !== null) {
            const col = cMatch[1]; // A, B, C...
            const type = cMatch[3]; // s (shared string), or undefined (number)
            const val = cMatch[4];

            let cellValue = val;
            if (type === 's' && val !== undefined) {
                cellValue = strings[parseInt(val)];
            } else if (val) {
                // Number
                cellValue = parseFloat(val);
            }

            cells[col] = cellValue;
        }
        rows.push(cells);
    }

    console.log("Parsed Rows:", rows.length);
    console.log(JSON.stringify(rows.slice(0, 30), null, 2));

    // Heuristics to identify structure
    // Usually: Col A = Name, Col B = Desc, Col C = Price?
}

parseExcel();
