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

### 1-4. Dify 워크플로우 구성 및 API 검증 완료 (완료)
- `.env`에 사내 Dify API 설정 및 SSL 인증서 우회 로직 적용.
- `scripts/test_dify.js`를 통해 **동적 컨텍스트 수집 -> Dify 전송 -> 정확한 폴더 및 태그 JSON 응답 수신** E2E 테스트 성공.
- Dify 프롬프트 원본을 레포지토리 내 `dify/system_prompt.md` 파일로 저장하여 버전 관리 체계 구축.

---

## 2. 현재 남은 할 일 (To-Do)

### Step 3: 메인 실행 스크립트 작성 (Phase 3)
- [ ] `scripts/migrator.js` : 타 스페이스에서 수정된 글 수집 -> Dify 판단 -> 복사 로직 작성
- [ ] `scripts/auditor.js` : AA 스페이스 전수 검사 -> Dify 판단 -> 위치/라벨 수정 로직 작성
- [ ] `scripts/batch_utility.js` : 단순 1:1 라벨 교체용 수동 배치 툴 작성

### Step 4: GitHub Actions 연동 및 알림 (Phase 4)
- [ ] `.github/workflows/confluence_automation.yml` 파일 작성 (Cron 스케줄 및 Workflow Dispatch 트리거 설정)
- [ ] Slack/Email Webhook을 연동하여 작업 결과 및 `needs_new_category` 발생 시 예외 알림 기능 구현

---

> **다음 진행 단계**: `migrator.js` 스크립트 작성 시작.
