import fitz  # PyMuPDF

# Extracts text from all pages of the given PDF file
def extract_text_from_pdf(filepath: str) -> str:
    text = ""
    try:
        with fitz.open(filepath) as doc:
            for page in doc:
                text += page.get_text()
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
    return text
