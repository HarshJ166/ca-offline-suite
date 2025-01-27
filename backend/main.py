import os
import uvicorn
import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from fastapi.responses import HTMLResponse
from fastapi import Body
import matplotlib
matplotlib.use('Agg')
# from findaddy.exceptions import ExtractionError
from .utils import get_saved_pdf_dir
TEMP_SAVED_PDF_DIR = get_saved_pdf_dir()

# If you have other custom imports:
from backend.tax_professional.banks.CA_Statement_Analyzer import start_extraction_add_pdf

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Bank Statement Analyzer API")
logger.info(f"Temp directory python : {TEMP_SAVED_PDF_DIR}")

class BankStatementRequest(BaseModel):
    bank_names: List[str]
    pdf_paths: List[str]
    passwords: Optional[List[str]] = []  # Optional field, defaults to empty list
    start_date: List[str]
    end_date: List[str]
    ca_id: str

class DummyRequest(BaseModel):
    data: str

@app.get("/", response_class=HTMLResponse)
async def root():
    return "<h1>Yes, I am alive!</h1>"

@app.post("/")
async def root(data: str = Body(...)):
    print("Received data in root : ", data)
    return {"message": "Bank Statement Analyzer API"}

@app.post("/analyze-statements/")
async def analyze_bank_statements(request: BankStatementRequest):
    try:
        logger.info(f"Received request with banks: {request.bank_names}")
        print("Start Date : ", request.start_date)
        print("End Date : ", request.end_date)
        print("PDF Paths : ", request.pdf_paths)

        # Create a progress tracking function
        def progress_tracker(current: int, total: int, info: str) -> None:
            logger.info(f"{info} ({current}/{total})")

        progress_data = {
            "progress_func": progress_tracker,
            "current_progress": 10,
            "total_progress": 100,
        }

        # Validate passwords length if provided
        if request.passwords and len(request.passwords) != len(request.pdf_paths):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Number of passwords ({len(request.passwords)}) "
                    f"must match number of PDFs ({len(request.pdf_paths)})"
                ),
            )

        logger.info("Initializing CABankStatement")
        # Pass empty list if no passwords

        bank_names = request.bank_names 
        pdf_paths = request.pdf_paths
        passwords =  request.passwords if request.passwords else []
        start_date = request.start_date if request.start_date else []
        end_date = request.end_date if request.end_date else []
        CA_ID = request.ca_id
        progress_data = progress_data

        logger.info("Starting extraction")
        result = start_extraction_add_pdf(bank_names, pdf_paths, passwords, start_date, end_date, CA_ID, progress_data)
        print("RESULT GENERATED")
        logger.info("Extraction completed successfully")
        return {
            "status": "success",
            "message": "Bank statements analyzed successfully",
            "data": result["sheets_in_json"],
            "pdf_paths_not_extracted": result["pdf_paths_not_extracted"],
        }

    except Exception as e:
        logger.error(f"Error processing bank statements: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error processing bank statements: {str(e)}"
        )


@app.post("/refresh/")
async def refresh(request: BankStatementRequest):
    pass


@app.post("/add-pdf/")
async def add_pdf(request: BankStatementRequest):
    pass


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    # Optionally use environment variables for host/port. Falls back to "127.0.0.1" and 7500 if none provided.
    host = os.getenv("API_HOST", "127.0.0.1")
    port = int(os.getenv("API_PORT", "7500"))

    # uds_path = "/tmp/bank_statement_analyzer.sock"

    # Clean up any old socket
    # if os.path.exists(uds_path):
        # os.remove(uds_path)

    # Start the FastAPI server on the Unix socket
    # uvicorn.run("main:app", uds=uds_path, log_level="info", reload=False)


    # IMPORTANT: reload=False for production usage
    uvicorn.run(app, host=host, port=port, reload=False)