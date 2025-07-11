import os
import shutil
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from pdf_extract import extract_text_from_pdf
from qna import create_qa_chain
import uvicorn

# Folder where uploaded files will be temporarily stored
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# In-memory variables for storing extracted text and QA chain
stored_text = ""
qa_chain = None

app = FastAPI()

# Endpoint: Upload a PDF and extract its text
@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    global stored_text, qa_chain
    filepath = os.path.join(UPLOAD_FOLDER, file.filename)

    try:
        # Save uploaded PDF to disk
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Extract text from PDF
        stored_text = extract_text_from_pdf(filepath)
        if not stored_text:
            raise HTTPException(status_code=400, detail="Could not extract text from PDF.")

        # Initialize the QA chain with the extracted text
        qa_chain = create_qa_chain(stored_text)

        return {
            "message": "PDF uploaded and processed successfully!",
            "text_preview": stored_text[:500] + "..." if len(stored_text) > 500 else stored_text
        }

    except Exception as e:
        if os.path.exists(filepath):
            os.remove(filepath)
        print(f"Error during PDF upload/processing: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {e}")

    finally:
        # Clean up the uploaded file
        if os.path.exists(filepath):
            os.remove(filepath)

# Endpoint: Ask questions about the uploaded document
@app.post("/ask")
async def ask_question(question: str = Form(...)):
    global qa_chain

    if not qa_chain:
        raise HTTPException(status_code=400, detail="No document uploaded.")

    try:
        chain_result = qa_chain.invoke({"query": question})
        answer = chain_result.get("result", "No answer found.").split("</think>")[-1].strip()
        return {"answer": answer}
    except Exception as e:
        print(f"Exception during QA chain invocation: {e}")
        raise HTTPException(status_code=500, detail=f"Error asking question: {e}")

# Serve static frontend (React build) from root URL
app.mount("/", StaticFiles(directory="frontend/build", html=True), name="static_files_root")

# Local development server
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
