from pdfminer.high_level import extract_text
import os

def read_pdf(path, output_file):
    print(f"Reading {path}...")
    try:
        text = extract_text(path)
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(text)
        print("Done.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    base_path = "c:/Users/ddiaz/OneDrive/Escritorio/PRODUCCION LO MAS RICO V3/"
    fname = "Fichas De Productos – Lo Más Rico.pdf"
    read_pdf(os.path.join(base_path, fname), "fichas_content.txt")
