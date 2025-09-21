 import os
import json
import google.generativeai as genai
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv
import PyPDF2
import docx

# --- INITIALIZATION ---
load_dotenv()
app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# --- CONFIGURE THE GOOGLE AI MODEL ---
try:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in .env file")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash')
except Exception as e:
    print(f"FATAL ERROR: Could not configure Google AI. Please check your API key. Error: {e}")
    model = None

# --- HELPER FUNCTION TO READ FILES ---
def read_document(file):
    filename = file.filename
    text = ""
    try:
        if filename.endswith('.pdf'):
            reader = PyPDF2.PdfReader(file)
            for page in reader.pages:
                text += page.extract_text() or ''
        elif filename.endswith('.docx'):
            doc = docx.Document(file)
            for para in doc.paragraphs:
                text += para.text + '\n'
        else:
            text = file.read().decode('utf-8')
    except Exception as e:
        print(f"Error reading document {filename}: {e}")
        return ""
    return text

# --- UTILITY TO CLEAN AND LOAD JSON ---
def clean_and_load_json(response_text):
    """Cleans the AI's response text and loads it into a Python object."""
    cleaned_text = response_text.strip().replace("```json", "").replace("```", "")
    if not cleaned_text:
        return None
    try:
        return json.loads(cleaned_text)
    except json.JSONDecodeError as e:
        print(f"JSON Decode Error: {e}")
        print(f"Original Text: {cleaned_text}")
        return None

# --- API ENDPOINTS ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/acts', methods=['POST'])
def get_act_explanation():
    if not model: return jsonify({"error": "AI model not configured"}), 500
    query = request.json.get('query', '')
    if not query: return jsonify({"error": "No query provided"}), 400

    prompt = f"""
    You are a legal database expert. A user is asking about "{query}".
    Identify the relevant legal act, rule, or section, including its jurisdiction (country, state, or region).
    Provide a clear and concise explanation of what the law states, what it means in simple terms, and its significance.
    Format your response clearly with a main title for the act/section.
    If the user's query is ambiguous (e.g., "Section 12"), provide the most well-known or globally relevant interpretation.
    """
    response = model.generate_content(prompt)
    return jsonify({"explanation": response.text})

@app.route('/api/simplify', methods=['POST'])
def simplify_document():
    if not model: return jsonify({"error": "AI model not configured"}), 500
    if 'document' not in request.files: return jsonify({"error": "No document part"}), 400

    file = request.files['document']
    doc_text = read_document(file)
    if not doc_text: return jsonify({"error": "Could not read text from document"}), 400

    prompt = f"""
    Analyze the following legal document. Your task is to explain it in the simplest terms possible, as if explaining it to a 10-year-old child.
    Respond ONLY with a single valid JSON object that has two keys: "summary" and "definitions".
    The "summary" should use simple words, short sentences, and analogies.
    The "definitions" should be a dictionary explaining difficult words simply.
    Document Text: --- {doc_text[:8000]} ---
    """
    response = model.generate_content(prompt)
    parsed_json = clean_and_load_json(response.text)
    if parsed_json is None:
        return jsonify({"error": "Failed to get a valid response from AI"}), 500
    return jsonify(parsed_json)

@app.route('/api/explain', methods=['POST'])
def explain_concept():
    if not model: return jsonify({"error": "AI model not configured"}), 500
    data = request.json
    concept = data.get('concept', '')
    language = data.get('language', 'English')
    if not concept: return jsonify({"error": "No concept provided"}), 400
    
    prompt = f"""
    Explain the legal concept of "{concept}" in simple, easy-to-understand terms for a non-lawyer.
    Provide the explanation in {language}.
    Use a real-world example or an analogy to make it clearer.
    """
    response = model.generate_content(prompt)
    return jsonify({"explanation": response.text})

@app.route('/api/predict', methods=['POST'])
def predict_risks_and_outcome():
    if not model: return jsonify({"error": "AI model not configured"}), 500
    doc_text = request.json.get('text', '')
    if not doc_text: return jsonify({"error": "No text provided"}), 400

    prompt = f"""
    Act as a legal analyst. Analyze the following legal text.
    Return your response ONLY as a single valid JSON object with two main keys: "risks" and "prediction".

    1. The "risks" key should contain a JSON array of objects. Each object should have "risk", "clause", and "severity" (High, Medium, or Low). If no risks are found, return an empty array.
    
    2. The "prediction" key should contain a JSON object with two keys: "outcome" and "reasoning".
       - For "outcome", provide a short prediction like 'Likely to Win', 'Likely to Lose', or 'Uncertain'.
       - For "reasoning", provide a brief, simple explanation for your prediction based on the text.

    Text: --- {doc_text[:8000]} ---
    """
    response = model.generate_content(prompt)
    parsed_json = clean_and_load_json(response.text)
    if parsed_json is None:
        return jsonify({"error": "Failed to get a valid analysis from AI"}), 500
    return jsonify(parsed_json)

@app.route('/api/dictionary', methods=['POST'])
def define_term():
    if not model: return jsonify({"error": "AI model not configured"}), 500
    data = request.json
    term = data.get('term', '')
    language = data.get('language', 'English')
    if not term: return jsonify({"error": "No term provided"}), 400

    prompt = f"""
    Act as a dictionary. Provide a simple, one-sentence definition for the legal term "{term}".
    Respond ONLY with the definition text, in {language}.
    """
    response = model.generate_content(prompt)
    return jsonify({"definition": response.text})

@app.route('/api/timeline', methods=['POST'])
def get_timeline():
    if not model: return jsonify({"error": "AI model not configured"}), 500
    concept = request.json.get('concept', '')
    if not concept: return jsonify({"error": "No concept provided"}), 400

    prompt = f"""
    Generate a historical timeline for the legal concept: \"{concept}\".
    Respond ONLY with a valid JSON array of objects. Each object must have two keys: "year" (string) and "content" (string).
    """
    response = model.generate_content(prompt)
    parsed_json = clean_and_load_json(response.text)
    if parsed_json is None:
        return jsonify({"error": "Failed to get a valid timeline from AI"}), 500
    return jsonify(parsed_json)

@app.route('/api/chat', methods=['POST'])
def chat_with_doc():
    if not model: return jsonify({"error": "AI model not configured"}), 500
    doc_context = request.json.get('context', '')
    question = request.json.get('question', '')
    if not question or not doc_context: return jsonify({"error": "Missing context or question"}), 400

    prompt = f"""
    Based ONLY on the document text provided below, answer the user's question.
    If the answer is not in the text, say "That information is not found in this document."
    Document Context: --- {doc_context[:7000]} ---
    User Question: "{question}"
    """
    response = model.generate_content(prompt)
    return jsonify({"answer": response.text})

@app.route('/api/general_chat', methods=['POST'])
def general_chat():
    if not model: return jsonify({"error": "AI model not configured"}), 500
    question = request.json.get('question', '')
    if not question: return jsonify({"error": "No question provided"}), 400

    prompt = f"""
    You are LegalEase AI, a helpful and friendly assistant.
    Your primary role is to explain legal topics in simple terms.
    However, you can also answer general questions and engage in friendly conversation.
    Important rule: NEVER provide legal advice.
    User Question: "{question}"
    """
    response = model.generate_content(prompt)
    return jsonify({"answer": response.text})

# --- START THE SERVER ---
if __name__ == '__main__':
    app.run(debug=True, port=5001)
