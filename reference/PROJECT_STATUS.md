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

### 1-3. 최신 트러블슈팅 및 버그 픽스 완료 내역 (최신)
- **`context_tree` 빈값 오류 수정**: `is-folder` 태그가 있는 폴더들의 계층 구조를 빌드할 때, 최상위 노드 판별 로직을 개선하여 20여 개의 폴더 트리가 정상적으로 Dify에 전달되도록 수정 완료.
- **`page_date` 정확성 개선**: Confluence v2 API의 `createdAt`(최근 수정일) 대신 v1 API의 `history.createdDate`(원본 최초 생성일)를 사용하도록 변경 완료. API 호출을 1회로 통합하여 속도 50% 향상.
- **날짜 기반 스캔 (LOOKBACK_DAYS)**: 기존 하드코딩된 개수(`limit=10`) 제한을 없애고, `spaces_config.json`의 `LOOKBACK_DAYS`(기본 7일) 설정에 따라 최근 며칠간 수정된 문서만 정확히 스캔하도록 CQL 개선.
- **사내망(Intranet) 접속 이슈 해결**: GitHub Actions가 사내망의 Dify/Confluence에 접근할 수 있도록, 우분투 리눅스 서버에 **Self-hosted Runner**를 구축하고 워크플로우를 `runs-on: self-hosted`로 변경 완료. (현재 정상 동작 확인)

---

## 2. 다음 세션(또는 집)에서 이어서 하실 일 🔥

현재 **Self-hosted Runner 기반으로 자동화 파이프라인이 사내망에서 완벽하게 동작 중**입니다. Dify 워크플로우 쪽 세팅도 대부분 완료하셨습니다. 다음 세션에서는 아래 항목들만 체크하시면 전체 시스템 구축이 최종 완료됩니다.

### [마무리 체크리스트]
1. **Dify 워크플로우 프롬프트 옵션 추가 (권장)**
   - LLM 노드(gpt-oss:120b)의 시스템 프롬프트 맨 마지막 줄에 아래 문구를 추가하여 JSON 응답 안정성을 높이시는 것을 권장합니다.
   - `DO NOT add any explanation or introductory text. Your ENTIRE response must be ONLY the JSON object.`
2. **`spaces_config.json`의 `LOOKBACK_DAYS` 조율**
   - 현재 `7`일로 세팅되어 있습니다. 운영 환경에 맞게 조율해 주세요. (예: 1일 단위 스케줄러면 `1` 또는 `2`로 설정)
3. **크론잡 주기 확인**
   - `.github/workflows/confluence_automation.yml` 파일의 cron 주기(`0 15 * * *`, 한국시간 자정)가 의도하신 주기와 맞는지 한 번 더 확인해 주세요.

---

> 💡 **가이드 참조**: 스크립트 실행법 및 전체 아키텍처 개요는 `walkthrough.md` 파일에 깔끔하게 정리해 두었습니다. 고생 많으셨습니다! 다음 세션에서 뵙겠습니다.
