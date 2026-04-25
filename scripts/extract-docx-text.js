
const fs = require('fs');
const path = require('path');

const xmlPath = 'd:\\PRODUCCION-LO-MAS-RICO-V3\\temp_gramajes\\word\\document.xml';
const content = fs.readFileSync(xmlPath, 'utf8');

// Simple regex to extract text within <w:t> tags
const textRegex = /<w:t[^>]*>(.*?)<\/w:t>/g;
let match;
let fullText = '';

while ((match = textRegex.exec(content)) !== null) {
    fullText += match[1] + ' ';
}

// Now search for keywords and print context
const keywords = ['Base', 'Peruab', 'Tropic', 'Cebolla', 'Piment', 'Leche']; // Peruab/Tropic partials
const relevantSnippets = [];

// Split by some delimiter? The docx text is continuous.
// Let's print the whole text to console if it's not too huge, or search.
// The user wants me to TELL them the bases.

console.log("--- DOCUMENT TEXT EXTRACT ---");
console.log(fullText.slice(0, 5000)); // Print start
console.log("...");

// Find specific sections
const baseIdx = fullText.indexOf("Base 4 kilos");
if (baseIdx !== -1) {
    console.log("--- FOUND BASE 4 KILOS ---");
    console.log(fullText.slice(baseIdx, baseIdx + 500));
}

const peruanoIdx = fullText.toLowerCase().indexOf("peruano");
if (peruanoIdx !== -1) {
    console.log("--- FOUND PERUANO ---");
    console.log(fullText.slice(peruanoIdx, peruanoIdx + 500));
}

const tropicalIdx = fullText.toLowerCase().indexOf("tropical");
if (tropicalIdx !== -1) {
    console.log("--- FOUND TROPICAL ---");
    console.log(fullText.slice(tropicalIdx, tropicalIdx + 500));
}
