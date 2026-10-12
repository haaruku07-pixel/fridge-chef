# Fridge Chef — 링크 공유용 무료 AI 웹사이트

이 버전은 **Ollama가 필요 없습니다.** Python Flask + Gemini API + Render로 배포할 수 있습니다.
냉장고 재료와 즐겨찾기는 각 방문자 **브라우저의 localStorage**에 저장됩니다. 다른 방문자와 정보가 섞이지 않지만, 브라우저 데이터를 삭제하거나 다른 기기로 접속하면 목록이 보이지 않습니다. 로그인/기기간 동기화는 제공하지 않습니다.

## 1. Gemini API 키 발급

1. https://aistudio.google.com/api-keys 에 로그인해 API 키를 만듭니다.
2. Google AI Studio에서 **무료 등급 사용 가능 여부와 모델별 제한**을 확인합니다. 무료 등급은 사용량 제한이 있습니다.
3. 키를 공개 저장소에 올리거나 다른 사람에게 보내지 마세요.

## 2. 내 PC에서 미리 실행 (선택)

Windows PowerShell을 이 폴더에서 열고 다음을 순서대로 실행합니다.

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

`.env` 파일의 `GEMINI_API_KEY=` 뒤에 실제 API 키를 입력한 뒤:

```powershell
.\.venv\Scripts\python.exe app.py
```

http://127.0.0.1:5000 열기. **Ollama 설치는 불필요합니다.**

## 3. Render로 공개 링크 만들기

1. GitHub 계정을 만들고 **새 저장소**를 생성합니다.
2. 이 폴더 **안에 있는 파일들** (`app.py`, `render.yaml`, `templates/`, `static/` 등)을 저장소에 업로드합니다. `.env` 파일은 절대 업로드하지 않습니다.
3. https://dashboard.render.com/ 에 GitHub로 로그인합니다.
4. **New → Blueprint** 를 선택하고 GitHub 저장소를 연결한 다음 `render.yaml` 배포 구성을 적용합니다. 또는 **New → Web Service**로 저장소를 연결하고 무료 플랜에서 다음과 같이 지정합니다.
    - Build Command: `pip install -r requirements.txt`
    - Start Command: `gunicorn -b 0.0.0.0:$PORT app:app --workers 1 --threads 4 --timeout 75`
5. Render 환경 변수(Environment)에서 `GEMINI_API_KEY` 값에 실제 키를 넣습니다. `GEMINI_MODEL`은 기본 `gemini-3.5-flash-lite`로 둡니다. 모델 접근 오류가 나면 AI Studio의 사용 가능한 모델로 변경합니다.
6. Deploy가 끝나면 제공되는 `https://...onrender.com` 주소를 친구들에게 공유합니다.

> Render 무료 웹 서비스는 15분간 요청이 없으면 잠들고, 다음 접속 시 다시 켜지는 데 약 1분 걸릴 수 있습니다. Gemini 무료 API도 사용량 제한, 계정별 접근 제한이 있습니다. 공개 방문자가 많으면 API 한도에 빠르게 도달할 수 있습니다.

## 파일 구조

- `app.py`: 사이트 화면 및 AI 추천 API
- `ai_service.py`: Gemini API 호출 / AI 결과 처리
- `static/script.js`: 방문자별 재료/즐겨찾기 브라우저 저장
- `static/style.css`: 디자인
- `templates/index.html`: 웹 화면
- `render.yaml`: Render 무료 배포 설정
- `.env.example`: 로컬 설정 예시

## 주의

- 공개 시 API 키는 반드시 서버 환경 변수로만 관리하세요.
- 기존 Ollama 버전의 SQLite 저장 정보는 이 버전으로 자동으로 옮겨지지 않습니다.
- AI 요리법의 정확성 및 식품 안전은 직접 확인해야 합니다.
- **실제 Gemini API 호출과 Render 배포는 계정/키가 없어 여기에서 수행하지 않았습니다.**
