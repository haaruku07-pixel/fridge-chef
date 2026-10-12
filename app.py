import os
from datetime import date
from flask import Flask, jsonify, render_template, request
from dotenv import load_dotenv
from ai_service import get_recommendations

load_dotenv()
app = Flask(__name__)
app.json.ensure_ascii = False
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024

@app.get('/')
def index():
    return render_template('index.html')

@app.get('/health')
def health():
    return jsonify(ok=True)

@app.post('/api/recommend')
def recommend():
    data = request.get_json(silent=True) or {}
    try:
        minutes = int(data.get('max_minutes', 30))
    except (TypeError, ValueError):
        return jsonify(error='조리 시간이 올바르지 않습니다.'), 400
    difficulty = data.get('difficulty', '상관없음')
    if minutes not in (15, 30, 60, 120) or difficulty not in ('상관없음', '쉬움', '보통', '어려움'):
        return jsonify(error='조리 조건이 올바르지 않습니다.'), 400
    raw = data.get('ingredients', [])
    if not isinstance(raw, list) or not 1 <= len(raw) <= 40:
        return jsonify(error='재료를 1~40개 입력해 주세요.'), 400
    ingredients = []
    for item in raw:
        if not isinstance(item, dict) or not isinstance(item.get('name'), str) or not 1 <= len(item['name'].strip()) <= 50:
            return jsonify(error='재료 이름 형식이 올바르지 않습니다.'), 400
        expiry = item.get('expiry_date') or None
        if expiry is not None:
            if not isinstance(expiry, str) or len(expiry) != 10:
                return jsonify(error='소비기한 형식이 올바르지 않습니다.'), 400
            try:
                date.fromisoformat(expiry)
            except ValueError:
                return jsonify(error='소비기한 형식이 올바르지 않습니다.'), 400
        ingredients.append({'name': item['name'].strip(), 'expiry_date': expiry})
    try:
        result = get_recommendations(ingredients, minutes, difficulty)
        return jsonify(result)
    except RuntimeError as exc:
        return jsonify(error=str(exc)), 502

@app.errorhandler(413)
def too_big(_):
    return jsonify(error='요청 내용이 너무 큽니다.'), 413

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=int(os.environ.get('PORT', '5000')), debug=os.environ.get('FLASK_DEBUG') == '1')
