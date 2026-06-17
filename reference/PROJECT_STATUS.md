# 🚀 프로젝트 진행 상황 핸드오프 (Handoff)

> 작성일: 2026-06-17  
> **다른 PC에서 작업을 이어서 하기 위한 상태 및 할 일 요약 문서입니다.**

---

## 1. 지금까지 완료된 작업 (Done)

### 1-1. 1차 마이그레이션 이슈 해결 (AA 스페이스 초기 세팅 완료)
- SD 스페이스 -> AA 스페이스 이관 과정에서 발생한 첨부파일 다운로드 이슈 해결 완료.
- AWS S3 리다이렉트 400 오류 및 구버전 API 401 권한 에러를 **최신 REST API 엔드포인트 적용**으로 우회 성공.
- 이미지 파일은 정상 복사 및 업로드 처리, 동영상 파일은 원본 링크 배너 표기로 대체 합의.

### 1-2. 자동화 아키텍처 설계 확정 (GitHub Actions + Dify)
- **하이브리드 아키텍처**: GitHub Actions가 스케줄러 및 실행(API 통신)을 담당하고, Dify가 LLM 판단(두뇌)을 담당하는 구조로 확정.
- **동적 컨텍스트 주입 (Dynamic Context Injection)**: AA 스페이스에 폴더가 새로 생기더라도 하드코딩 갱신 없이, 스크립트 실행 시점에 실시간으로 Confluence 폴더 트리를 읽어와 Dify 프롬프트에 주입하는 획기적인 방식 채택.
- **AA Space Auditor (자가 정화기) 추가**: 단순 타 스페이스 이관뿐만 아니라, AA 스페이스 내부의 잘못된 폴더/태그를 자동 교정하는 기능 설계 추가.

### 1-3. 기반 유틸리티 코드 작성
- `scripts/utils/confluence_api.js`: Confluence 공통 통신 모듈 및 `fetchAASpaceTreeText()` (동적 컨텍스트 수집) 함수 개발 완료.
- `scripts/utils/dify_api.js`: Dify 워크플로우 API 통신 및 JSON 파싱 인터페이스 초안 개발 완료.

---

## 2. 다른 PC에서 이어서 할 일 (To-Do)

집에 있는 다른 PC에서 이 레포지토리를 `git pull` 받으신 후 아래 순서대로 진행하시면 됩니다.

### Step 1: 환경 변수 (.env) 세팅
새 PC의 프로젝트 루트 폴더에 `.env` 파일을 만들고 아래 정보들을 채워주세요. (기존 Confluence 토큰 외에 Dify 토큰이 추가로 필요합니다.)
```env
CONFLUENCE_EMAIL=본인_이메일
CONFLUENCE_TOKEN=아틀라시안_API_토큰

# 새로 추가된 Dify 워크플로우 API 정보
DIFY_API_URL=https://api.dify.ai/v1/workflows/run  # (실제 사내 Dify URL에 맞게 변경)
DIFY_API_KEY=app-xxxxxxxxxxxxxxxxxxxxxxx
```

### Step 2: 사내 Dify 워크플로우 생성
1. Dify에 접속하여 **Workflow (또는 Chatflow) 생성**.
2. **시작 노드(Start)** 변수 세팅:
   - `page_title` (String)
   - `page_body` (String)
   - `context_tree` (String) - *여기에 동적 컨텍스트 주입됨*
3. **LLM 노드** 세팅: 
   - 모델을 지정하고 시스템 프롬프트에 `reference/aa_space_dify_knowledge.md`의 내용을 복사+붙여넣기 (단, 폴더 ID 하드코딩 부분은 지우고 `context_tree` 변수를 참조하라고 명시).
   - JSON 형태로 출력 포맷 지정 (`is_valid`, `target_folder_id`, `labels`, `needs_new_category`).
4. **종료 노드(End)** 세팅: LLM의 결과물(JSON)을 반환.
5. 우측 상단의 **'API 참조' (API Access)** 버튼을 눌러 API Key를 발급받아 `Step 1`의 `.env`에 등록.

### Step 3: 메인 실행 스크립트 작성 (Agent에게 지시)
새 PC에서 Agent에게 이 문서를 보면서 아래 스크립트들을 작성해 달라고 요청하세요.
- [ ] `scripts/migrator.js` : 타 스페이스에서 수정된 글 수집 -> Dify 판단 -> 복사 로직 작성
- [ ] `scripts/auditor.js` : AA 스페이스 전수 검사 -> Dify 판단 -> 위치/라벨 수정 로직 작성
- [ ] `scripts/batch_utility.js` : 단순 1:1 라벨 교체용 수동 배치 툴 작성

### Step 4: GitHub Actions 연동 및 알림
- [ ] `.github/workflows/confluence_automation.yml` 파일 작성 (Cron 스케줄 및 Workflow Dispatch 트리거 설정)
- [ ] Slack/Email Webhook을 연동하여 작업 결과 및 `needs_new_category` 발생 시 예외 알림 기능 구현

---

> **Agent 호출 팁**: 새 PC에서 환경 세팅 후, Agent에게 *"PROJECT_STATUS.md에 명시된 Step 3의 migrator.js 작성을 이어서 진행해줘"* 라고 말씀해 주시면 상황을 파악하고 바로 코딩을 시작할 것입니다. 조심히 퇴근하십시오!
