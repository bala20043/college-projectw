from flask import Flask, render_template, request, jsonify, redirect, url_for
import requests
import re
import sqlite3
import os
from werkzeug.utils import secure_filename
from PIL import Image
from gtts import gTTS   # ADDED FOR FEMALE VOICE

try:
    import pytesseract
except ImportError:
    pytesseract = None

try:
    from PyPDF2 import PdfReader
except ImportError:
    PdfReader = None

app = Flask(__name__)

# ================= OPENROUTER MULTI-KEY CONFIG =================
API_KEYS = [k.strip() for k in os.getenv("OPENROUTER_API_KEYS", "").split(",") if k.strip()]
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@gmail.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

api_index = 0

def get_current_key():
    return API_KEYS[api_index]

def switch_key():
    global api_index
    if api_index < len(API_KEYS) - 1:
        api_index += 1
        return True
    return False

def format_ai_response(text):
    text = re.sub(r'[#*`]', '', text)
    text = text.replace("- ", "• ")
    return text.strip()

# ================= DATABASE SETUP =================
def init_db():
    conn = sqlite3.connect("college.db")
    c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS college_info (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    keyword TEXT,
                    answer TEXT
                )''')

    c.execute('''CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT,
                    password TEXT,
                    role TEXT
                )''')

    if not c.execute("SELECT * FROM users WHERE role='admin'").fetchone():
        c.execute("INSERT INTO users (email, password, role) VALUES (?, ?, ?)",
                  (ADMIN_EMAIL, ADMIN_PASSWORD, 'admin'))

    if not c.execute("SELECT * FROM users WHERE email=? AND role IS NULL",
                     ('msbalamuruganself2025@gmail.com',)).fetchone():
        c.execute("INSERT INTO users (email, password, role) VALUES (?, ?, ?)",
                  ('msbalamuruganself2025@gmail.com', '1234', None))

    conn.commit()
    conn.close()

init_db()

# ================= LANGUAGE DETECTION =================
def is_tamil(text):
    return any('\u0B80' <= ch <= '\u0BFF' for ch in text)

def detect_language(message):
    if is_tamil(message):
        return "tamil"
    if bool(re.search("[அஆஇஈஉஊஎஏஐஓஔ]", message)):
        return "tamil"
    if re.search(r"[a-zA-Z]", message) and any(w in message.lower() for w in ["enna", "epdi", "saptingala", "podu"]):
        return "tunglish"
    return "english"

# ================= FEMALE VOICE TTS (ALICE VOICE) =================
def create_female_voice(text, lang):
    voice_dir = os.path.join(app.root_path, "static", "voice")
    os.makedirs(voice_dir, exist_ok=True)

    filepath = os.path.join(voice_dir, "voice.mp3")

    if lang == "tamil":
        tts = gTTS(text=text, lang='ta', slow=False)
    else:
        # Alice-like female UK voice
        tts = gTTS(text=text, lang='en', slow=False, tld="co.uk")

    tts.save(filepath)
    return "/static/voice/voice.mp3"

# ================= HOME PAGE =================
@app.route("/")
def home():
    return render_template("index.html")

# ================= NORMAL AI CHATBOT (WITH ALICE VOICE) =================
@app.route("/ask", methods=["POST"])
def ask():
    global api_index
    message = request.json.get("message")
    lang = detect_language(message)
    if not API_KEYS:
        return jsonify({"reply": "Server configuration error: missing OPENROUTER_API_KEYS"}), 500

    system_instruction = {
        "english": "Reply shortly (2-3 lines). Use bullets.",
        "tamil": "எப்போதும் தமிழ் மொழியில் மட்டும் பதில் அளிக்கவும். 2-3 வரிகளாக மட்டும் எழுதவும்.",
        "tunglish": "Tamil words in English letters. Reply Tunglish. Short 2-3 lines."
    }[lang]

    while api_index < len(API_KEYS):
        headers = {
            "Authorization": f"Bearer {get_current_key()}",
            "Content-Type": "application/json"
        }

        data = {
            "model": "openai/gpt-oss-20b:free",
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": message}
            ]
        }

        try:
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers, json=data
            )

            if response.status_code == 200:
                reply = response.json()["choices"][0]["message"]["content"]
                final_text = format_ai_response(reply)

                # ==== FEMALE ALICE VOICE ADDED ====
                lang_voice = "tamil" if lang == "tamil" else "english"
                voice_url = create_female_voice(final_text, lang_voice)

                return jsonify({
                    "reply": final_text,
                    "voice": voice_url
                })

            if switch_key():
                continue
            return jsonify({"reply": f"API Error: {response.text}"})

        except:
            if switch_key():
                continue
            return jsonify({"reply": "Server Error"})

    return jsonify({"reply": "All API keys expired!"})

# ================= COLLEGE FAQ CHATBOT =================
@app.route("/college-ask", methods=["POST"]) 
def college_ask():
    # Robust matching to handle partial words and comma-separated admin keywords
    question = (request.json.get("message") or "").strip().lower()
    if not question:
        return jsonify({"reply": "No question provided."})

    conn = sqlite3.connect("college.db")
    c = conn.cursor()

    # 1) Direct exact or substring match against stored keyword
    c.execute("SELECT answer, keyword FROM college_info WHERE LOWER(keyword)=? OR LOWER(keyword) LIKE ?", (question, f"%{question}%"))
    row = c.fetchone()
    if row:
        conn.close()
        return jsonify({"reply": row[0]})

    # 2) Fetch all and perform programmatic matching to handle comma-separated keywords and word matches
    c.execute("SELECT answer, keyword FROM college_info")
    rows = c.fetchall()

    # tokenise question into words
    words = [w for w in re.findall(r"\w+", question) if len(w) > 1]

    for answer, keyword in rows:
        k = (keyword or "").lower()

        # if question phrase is in stored keyword
        if question in k:
            conn.close()
            return jsonify({"reply": answer})

        # check comma-separated parts
        parts = [p.strip() for p in k.split(",") if p.strip()]
        for p in parts:
            if question == p or question in p or p in question:
                conn.close()
                return jsonify({"reply": answer})

        # word-based matching: match any significant token
        for w in words:
            if w and w in k:
                conn.close()
                return jsonify({"reply": answer})

    conn.close()

    # 3) predefined fallback answers
    predefined_answers = {
        "college name": "Tamil Nadu Government Polytechnic College, Madurai.",
        "department": "CSE, Mechanical, Civil, ECE",
        "principal": "Dr. R. Kumaravel",
        "location": "Madurai, Tamil Nadu.",
        "timing": "9 AM – 4:30 PM",
        "library": "9 AM – 5 PM",
        "labs": "Modern Lab Facilities Available"
    }

    for key in predefined_answers:
        if key in question:
            return jsonify({"reply": predefined_answers[key]})

    return jsonify({"reply": "No record found."})

# ================= ADMIN DASHBOARD =================
@app.route("/admin_dashboard")
def admin_dashboard():
    return render_template("admin_dashboard.html")

# ================= LOGIN ROUTES =================
@app.route("/user_login", methods=["POST"])
def user_login():
    data = request.get_json()
    conn = sqlite3.connect("college.db")
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE email=? AND password=? AND role IS NULL",
              (data["email"], data["password"]))
    result = c.fetchone()
    conn.close()
    return jsonify({"success": bool(result)})

@app.route("/admin_login", methods=["POST"])
def admin_login():
    data = request.get_json()
    conn = sqlite3.connect("college.db")
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE email=? AND password=? AND role='admin'",
              (data["email"], data["password"]))
    result = c.fetchone()
    conn.close()
    return jsonify({"success": bool(result)})

# ================= CRUD ROUTES =================
@app.route("/get_college_info", methods=["GET"])
def get_college_info():
    conn = sqlite3.connect("college.db")
    c = conn.cursor()
    c.execute("SELECT * FROM college_info")
    rows = [{"id": r[0], "keyword": r[1], "answer": r[2]} for r in c.fetchall()]
    conn.close()
    return jsonify(rows)

@app.route("/add_college_info", methods=["POST"])
def add_college_info():
    data = request.json
    conn = sqlite3.connect("college.db")
    c = conn.cursor()
    c.execute("INSERT INTO college_info (keyword, answer) VALUES (?, ?)",
              (data["keyword"], data["answer"]))
    conn.commit()
    conn.close()
    return jsonify({"message": "Information added!"})

@app.route("/delete_college_info/<int:id>", methods=["DELETE"])
def delete_college_info(id):
    conn = sqlite3.connect("college.db")
    c = conn.cursor()
    c.execute("DELETE FROM college_info WHERE id = ?", (id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Deleted!"})

# ================= FILE UPLOAD =================
@app.route('/upload-file', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400

    uploads_dir = os.path.join(app.root_path, 'static', 'uploads')
    os.makedirs(uploads_dir, exist_ok=True)

    filename = secure_filename(file.filename)
    file.save(os.path.join(uploads_dir, filename))

    file_url = url_for('static', filename='uploads/' + filename)
    return jsonify({'success': True, 'filename': filename, 'url': file_url})

# ================= EXPLAIN FILE =================
@app.route("/explain-file", methods=["POST"])
def explain_file():
    filename = request.json.get("filename")
    filepath = os.path.join(app.root_path, "static", "uploads", filename)

    if not os.path.exists(filepath):
        return jsonify({"success": False, "error": "File not found"}), 400

    extracted = ""

    if filename.lower().endswith((".jpg", ".jpeg", ".png", ".bmp")):
        if pytesseract is None:
            return jsonify({"success": False, "error": "pytesseract not installed"}), 500
        img = Image.open(filepath)
        extracted = pytesseract.image_to_string(img)

    elif filename.lower().endswith(".pdf"):
        if PdfReader is None:
            return jsonify({"success": False, "error": "PyPDF2 not installed"}), 500
        reader = PdfReader(filepath)
        for page in reader.pages:
            extracted += page.extract_text() + "\n"

    if not extracted.strip():
        return jsonify({"success": False, "error": "No text detected"}), 400
    if not API_KEYS:
        return jsonify({"success": False, "error": "Missing OPENROUTER_API_KEYS"}), 500

    headers = {"Authorization": f"Bearer {get_current_key()}", "Content-Type": "application/json"}
    payload = {
        "model": "openai/gpt-oss-20b:free",
        "messages": [
            {"role": "system", "content": "Explain the text in simple bullet points."},
            {"role": "user", "content": extracted}
        ]
    }

    response = requests.post("https://openrouter.ai/api/v1/chat/completions",
                             headers=headers, json=payload)
    ai_reply = response.json()["choices"][0]["message"]["content"]

    return jsonify({
        "success": True,
        "extracted_text": extracted,
        "explanation": format_ai_response(ai_reply)
    })

# ================= START SERVER =================
if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", 5000)),
        debug=False
    )
