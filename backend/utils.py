import tempfile
import os

def get_saved_pdf_dir():
    
    TEMP_SAVED_PDF_DIR = os.path.join(tempfile.gettempdir(), "saved_pdf")

    return TEMP_SAVED_PDF_DIR
