# 🚀 프로젝트 진행 상황 핸드오프 (Handoff)

> 작성일: 2026-06-19 (퇴근 전 마지막 업데이트)
> **집(다른 PC)에서 작업을 이어서 하기 위한 상태 및 '해야 할 일(Homework)' 요약 문서입니다.**

---

## 1. 지금까지 완료된 작업 (Done)

### 1-1. 마이그레이션(Migrator) 및 자가 정화(Auditor) 파이프라인 개발 완료
- **`migrator.js`**: 외부 스페이스(다중 지원)에서 문서를 스캔하고, Dify 판단 하에 유효한 문서만 이미지와 함께 AA 스페이스로 자동 이관.
- **`auditor.js`**: AA 스페이스 내부 문서들의 위치와 태그 무결성을 Dify와 교차 검증하여, 엉뚱한 곳에 들어간 문서를 스스로 원래 위치로 옮기고 태그를 자동 복구(Self-Healing).

### 1-2. 아키텍처 확장 (관리자님 피드백 완벽 반영)
- **다중 스페이스 지원 (`spaces_config.json`)**: 여러 팀/과제 스페이스를 손쉽게 껐다 켤 수 있도록 설정 파일 분리 완료.
- **Dify Knowledge (지식 베이스) 룰 위임**: 스크립트는 출신지(`source_space_key`)만 전달하고, 스페이스별 구체적인 필터링 룰은 Dify 내부에서 지식을 검색해 판별하도록 로직 및 파라미터 간소화 완료.
- **원격 일괄 처리 (`confluence_batch.yml`)**: GitHub Actions 웹 UI를 통해 클릭 몇 번으로 스페이스 전체의 레이블을 일괄 치환(rename)하거나 삭제(delete)할 수 있는 인프라 구축.

---

## 2. 퇴근 후 집에서 이어서 하실 일 (Homework) 🔥

집에 가셔서 다음 **세 가지 작업**을 진행해 주시면 전체 시스템이 완벽하게 굴러가기 시작합니다!

### [과제 1] Dify 워크플로우 쪽 세팅 (가장 중요!)
코드는 `source_space_key`를 넘겨주도록 모두 세팅되었습니다. 이제 Dify 쪽에 룰을 심어줄 차례입니다.
1. Dify 워크플로우의 **시작 노드(Start)** 입력 변수에 `source_space_key` (String 타입)를 추가합니다.
2. Dify **지식(Knowledge)** 에 스페이스별 정책 문서(예: `space_rules.txt` - "SD는 이런 성격이고, HW는 저런 성격이다" 등의 내용)를 작성해 업로드합니다.
3. 시작 노드와 LLM 노드 사이에 **지식 검색(Knowledge Retrieval) 노드**를 배치하고, 검색어(Query)로 `source_space_key` 변수를 넣습니다.
4. 검색되어 나온 결과를 LLM 노드의 시스템 프롬프트(Context)에 꽂아줍니다.

### [과제 2] AA 스페이스 수동 정리 및 기준 확립
현재 AA 스페이스 전체 문서의 `is-folder` 레이블은 모두 지워져 백지상태입니다.
1. Confluence 웹에 접속하셔서 관리자님만의 기준대로 문서 분류, 폴더 트리 구조화, 레이블링 작업을 수동으로 진행해 봅니다.
2. 정리가 끝나고 기준이 확립되면, 스크립트 코드 내의 `AA_SPACE_TREE` 변수(또는 Dify 시스템 프롬프트의 카테고리 목록)를 그 기준에 맞게 최종 업데이트해 줍니다.

### [과제 3] GitHub Actions 시크릿 변수 등록 (선택/마무리)
매일 자정 자동화 봇이 돌게 하려면 GitHub Repository 설정에 환경변수가 필요합니다.
- `Settings > Secrets and variables > Actions` 메뉴 이동
- 4개의 Repository Secrets 등록:
  - `CONFLUENCE_EMAIL`
  - `CONFLUENCE_TOKEN`
  - `DIFY_API_KEY`
  - `SLACK_WEBHOOK_URL` (선택 사항: 예외 알림용)

---

> 💡 **가이드 참조**: 스크립트 실행법 및 전체 아키텍처 개요는 `walkthrough.md` 파일에 깔끔하게 정리해 두었습니다. 집에서 작업하실 때 참고해 주세요! 고생 많으셨습니다. 조심히 퇴근하세요!
