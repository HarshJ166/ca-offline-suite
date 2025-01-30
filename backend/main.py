import os
import uvicorn
import logging
from fastapi import FastAPI, HTTPException,Request
from pydantic import BaseModel
from typing import List, Optional
from fastapi.responses import HTMLResponse
from fastapi import Body
# import matplotlib
# matplotlib.use('Agg')
# from findaddy.exceptions import ExtractionError
from backend.utils import get_saved_pdf_dir
TEMP_SAVED_PDF_DIR = get_saved_pdf_dir()

# If you have other custom imports:
from backend.tax_professional.banks.CA_Statement_Analyzer import start_extraction_add_pdf,start_extraction_edit_pdf
from backend.account_number_ifsc_extraction import extract_accno_ifsc
from backend.pdf_to_name import extract_entities

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

class EditPdfRequest(BaseModel):
    bank_names: List[str]
    pdf_paths: List[str]
    passwords: Optional[List[str]] = []  # Optional field, defaults to empty list
    start_dates: List[str]
    end_dates: List[str]
    aiyaz_array_of_array: List[List[int]]
    whole_transaction_sheet: bool
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

        ner_results = {
                "Name": [],
                "Acc Number": []
            }

        # Process PDFs with NER
        start_ner = time.time()
        person_count = 0
        for pdf in pdf_paths:
            person_count+=1
            # result = pdf_to_name_and_accno(pdf)
            fetched_name = None
            fetched_acc_num = None

            name_entities = extract_entities(pdf)
            acc_number_ifsc = extract_accno_ifsc(pdf)

            print("name_entities:- ",name_entities)

            fetched_acc_num=acc_number_ifsc["acc"]

            if name_entities:
                for entity in name_entities:
                    if fetched_name==None:
                        fetched_name=entity

            if fetched_name:
                ner_results["Name"].append(fetched_name)
            else:
                ner_results["Name"].append(f"Statement {person_count}")
                
            if fetched_acc_num:
                ner_results["Acc Number"].append(fetched_acc_num)
            else:
                ner_results["Acc Number"].append("XXXXXXXXXXX")
        print("Ner results", ner_results)
        end_ner = time.time()
        print("Time taken to process NER", end_ner-start_ner)
        


        logger.info("Starting extraction")
        result = start_extraction_add_pdf(bank_names, pdf_paths, passwords, start_date, end_date, CA_ID, progress_data)
        
        print("RESULT GENERATED")
        logger.info("Extraction completed successfully")
        return {
            "status": "success",
            "message": "Bank statements analyzed successfully",
            "data": result["sheets_in_json"],
            "pdf_paths_not_extracted": result["pdf_paths_not_extracted"],
            "ner_results": ner_results, 
        }

    except Exception as e:
        logger.error(f"Error processing bank statements: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error processing bank statements: {str(e)}"
        )
    


@app.post("/column-rectify-add-pdf/")
async def column_rectify_add_pdf(request:EditPdfRequest):
    data = await request.json()  # This parses the request body as JSON
    print("Received request data:", data)
    try:

        # # Create a progress tracking function
        # def progress_tracker(current: int, total: int, info: str) -> None:
        #     logger.info(f"{info} ({current}/{total})")

        # progress_data = {
        # "progress_func": progress_tracker,
        # "current_progress": 10,
        # "total_progress": 100,
        # }

        # # Validate passwords length if provided
        # if request.passwords and len(request.passwords) != len(request.pdf_paths):
        #     raise HTTPException(
        #         status_code=400,
        #         detail=(
        #             f"Number of passwords ({len(request.passwords)}) "
        #             f"must match number of PDFs ({len(request.pdf_paths)})"
        #         ),
        #     )
        
        # bank_names = request.bank_names 
        # pdf_paths = request.pdf_paths
        # passwords =  request.passwords if request.passwords else []
        # start_date = request.start_date if request.start_date else []
        # end_date = request.end_date if request.end_date else []
        # CA_ID = request.ca_id
        # progress_data = progress_data
        # column_coordinates = request.columns
        # whole_transaction_sheet = request.whole_transaction_sheet
        # result = start_extraction_edit_pdf(bank_names, pdf_paths, passwords, start_date, end_date, CA_ID, progress_data,aiyaz_array_of_array=column_coordinates,whole_transaction_sheet=whole_transaction_sheet)

        return {"success": True, "message": "PDF rectification done (mocked)."}
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
    import time
    time.sleep(8)
    uvicorn.run(app, host=host, port=port, reload=False)