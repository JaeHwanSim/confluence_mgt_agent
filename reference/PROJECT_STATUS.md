# 🚀 프로젝트 진행 상황 핸드오프 (Handoff)

> 작성일: 2026-06-22 (최종 고도화 완료)
> **집(다른 PC)에서 작업을 이어서 하기 위한 상태 및 '해야 할 일(Homework)' 요약 문서입니다.**

---

## 1. 지금까지 완료된 작업 (Done)

### 1-1. 마이그레이션(Migrator) 및 자가 정화(Auditor) 파이프라인
- **`migrator.js`**: 외부 스페이스(다중 지원)에서 문서를 스캔하고, Dify 판단 하에 유효한 문서만 이미지와 함께 AA 스페이스로 자동 이관.
- **`auditor.js`**: AA 스페이스 내부 문서들의 위치와 태그 무결성을 Dify와 교차 검증하여, 엉뚱한 곳에 들어간 문서를 스스로 원래 위치로 옮기고 태그를 자동 복구(Self-Healing).

### 1-2. 궁극의 자동화 아키텍처 (최종 고도화)
- **다중 스페이스 지원 (`spaces_config.json`)**: 여러 팀/과제 스페이스(`SD`, `WND`, `Device`, `SmileArch`) 등록 완료.
- **지식(Knowledge) 일원화 (SSOT)**: 레이블과 정책을 `dify/space_rules_knowledge.md` 한 곳에서만 완벽히 관리하도록 통일. 월 단위(`month-YYYY-MM`) 태그 의무화.
- **원본 불변성 및 배너 각인 (Zero-Dependency)**: 문서를 이관할 때 배너에 `원본 스페이스`와 `원본 작성일`을 영구 각인하여, 나중에 태그 룰이 싹 바뀌어도 Auditor가 완벽하게 출처를 찾아내어 자가 치유 수행.
- **토큰 비용 0원 필터링 (Zero-Cost)**: 룰 버전(`ruleVersion`)과 문서 버전(`pageVersion`)을 교차 검증하여, 변경사항이 없는 문서는 LLM(Dify)을 아예 호출하지 않고 스킵.
- **GitHub 원격 자동화**: `.github/workflows/confluence_automation.yml` 배포. 개발 환경 없이도 GitHub 웹에서 버튼 클릭만으로 `migrator`와 `auditor` 실행 가능.

---

## 2. 퇴근 후 집에서 이어서 하실 일 (Homework) 🔥

집에 가셔서 다음 **세 가지 작업**을 진행해 주시면 전체 시스템이 완벽하게 굴러가기 시작합니다!

### [과제 1] Dify 워크플로우 세팅 및 지식 업로드 (가장 중요!)
1. 로컬의 `dify/space_rules_knowledge.md` 파일을 통째로 Dify **지식(Knowledge)** 에 업로드하여 벡터화합니다.
2. Dify 워크플로우의 **시작 노드(Start)** 에 두 개의 입력 변수를 만듭니다: 
   - `source_space_key` (String)
   - `page_date` (String)
3. 시작 노드와 LLM 노드 사이에 **지식 검색(Knowledge Retrieval) 노드**를 배치하고, 검색어(Query)로 `source_space_key` 변수를 넣습니다. (업로드한 지식 문서 연결)
4. LLM 노드의 시스템 프롬프트에 로컬의 `dify/system_prompt.md` 내용을 복사해 넣습니다.
   - 프롬프트 안의 `{{#context#}}` 변수 부분에 **지식 검색 노드의 결과물(`result`)**을 연결해 줍니다.
   - 프롬프트 안의 `{{page_date}}`, `{{page_title}}` 등의 변수들은 **시작 노드(Start)** 의 입력 변수들과 각각 클릭해서 연결해 줍니다.

### [과제 2] GitHub Actions 시크릿 변수 등록 (선택/마무리)
매일 자정 자동화 봇이 돌게 하거나 수동 실행 버튼을 쓰려면 GitHub Repository 설정에 환경변수가 필요합니다.
- `Settings > Secrets and variables > Actions` 메뉴 이동
- 4개의 Repository Secrets 등록:
  - `CONFLUENCE_EMAIL`
  - `CONFLUENCE_TOKEN`
  - `DIFY_API_URL` (로컬 .env에 설정하신 URL, 예: https://api.dify.ai/v1/workflows/run)
  - `DIFY_API_KEY`
  - `SLACK_WEBHOOK_URL` (선택 사항: 에러 시 슬랙 알림용)
  - `EMAIL_USERNAME` (선택 사항: 에러 시 발송할 SMTP 계정 이메일, 예: admin@gmail.com)
  - `EMAIL_PASSWORD` (선택 사항: SMTP 계정 앱 비밀번호)
  - `NOTIFY_EMAIL_TO` (선택 사항: 에러 메일을 수신할 대상 이메일 주소)

---

> 💡 **가이드 참조**: 스크립트 실행법 및 전체 아키텍처 개요는 `walkthrough.md` 파일에 깔끔하게 정리해 두었습니다. 집에서 작업하실 때 참고해 주세요! 고생 많으셨습니다. 조심히 퇴근하세요!
