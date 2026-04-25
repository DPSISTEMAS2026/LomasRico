
import os
import sys

# Force UTF-8 stdout
sys.stdout.reconfigure(encoding='utf-8')

from pypdf import PdfReader

# Adjust path for Windows
pdf_path = os.path.join("docs", "references", "RECETAS   LOMASRICO.pdf")

try:
    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    
    with open("scripts/recetas_output.txt", "w", encoding="utf-8") as f:
        f.write(text)
    
    print("PDF CONTENT SAVED TO scripts/recetas_output.txt")
except Exception as e:
    print(f"Error reading PDF: {e}")
