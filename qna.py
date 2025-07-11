from langchain.text_splitter import CharacterTextSplitter
from langchain_core.documents import Document
from langchain_huggingface.embeddings import HuggingFaceEmbeddings


from langchain_ollama import OllamaLLM #!<----- CHANGE HERE IF NEEDED


from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain_core.prompts import ChatPromptTemplate

# Creates a QA chain from raw text using LLM + embeddings + retrieval
def create_qa_chain(text: str):
    # Step 1: Split large text into smaller chunks
    splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    texts = splitter.split_text(text)
    docs = [Document(page_content=t) for t in texts]

    # Step 2: Convert chunks to embeddings
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")


    # Step 3: Use Ollama-compatible LLM (Qwen 0.6b here, but we can use any other model)
    llm = OllamaLLM(model="qwen3:0.6b", temperature=0.1) #!<----- CHANGE HERE IF NEEDED


    # Step 4: Create a FAISS vector store for retrieval
    vectordb = FAISS.from_documents(docs, embeddings)
    retriever = vectordb.as_retriever()

    # Step 5: Define prompt template to limit answers to only known context
    template = """You are an AI assistant tasked with answering questions SOLELY based on the provided context.
    If the answer is NOT present in the context below, state "I do not have enough information to answer that question based on the provided document."
    ---
    Context:
    {context}
    ---
    Question: {question}
    Answer:"""
    prompt = ChatPromptTemplate.from_template(template)

    # Step 6: Build the RetrievalQA chain
    qa = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        return_source_documents=False,
        chain_type_kwargs={"prompt": prompt},
        verbose=False
    )
    return qa
