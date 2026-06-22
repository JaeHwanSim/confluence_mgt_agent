# 스페이스별 문서 이관 및 판별 정책 (Space Rules Knowledge)

이 문서는 Dify Knowledge Base에 업로드되어, Dify LLM이 스페이스별로 문서의 **유효성, 타겟 폴더(위치), 레이블(태그)** 을 결정할 때 참조하는 핵심 지침(Guideline)입니다. LLM은 이 문서의 지침을 엄격히 따라야 합니다.

---

## 🚫 [전역(Global) 노이즈 필터링 (Drop Rule)]
- 문서 내용이 완전히 비어있거나 의미 없는 테스트용 페이지는 무조건 무시(Drop)합니다.
- '주간 보고(Weekly)' 또는 '월간 보고(Monthly)' 성격의 문서일 경우, 작성일(`page_date` 또는 본문 내용)이 **2025년 1월 1일 이후**인 것만 유효한 문서로 취급합니다. 그 이전의 과거 보고서는 모두 버립니다(Drop).

---

## 🏷️ [전역(Global) 레이블 사전]
스페이스별 필수 태그 외에, 문서의 성격에 맞춰 아래 레이블 풀에서 **적절한 태그를 최소 2개 이상 추가 조합**하여 부착하세요. (없는 태그를 지어내면 안 됩니다.)

- **발생 월 (Month) [필수]**: 입력으로 제공받은 `page_date` 문자열이나 본문에 명시된 작성 시점(년/월)을 기준으로 반드시 **`month-YYYY-MM`** 형식의 태그를 **1개 지어내어 부착**하세요. (예: 2026년 6월 15일 문서라면 `month-2026-06`)
- **문서 타입 (DocType)**: `doctype-mps-annual`, `doctype-mps-monthly`, `doctype-mps-weekly`, `doctype-project-status`, `doctype-tech-survey`, `doctype-market-survey`, `doctype-guideline`, `doctype-patent`, `doctype-gov-project`, `doctype-report`, `doctype-spec`, `doctype-plan`, `doctype-research`, `doctype-model`
- **관련 부서/그룹 (Group)**: `group-center`, `group-ai`, `group-sw`, `group-device`
- **진행 상태 (Status)**: `status-active`, `status-completed`, `status-evergreen`, `status-verified`
- **프로젝트 (Project)**: `project-navigation`, `project-implant-robot`, `project-smilearch`, `project-smart-godig-achi`, `project-digital-twin`

---

## 1. [SD] 스페이스 룰
- **스페이스 성격**: 덴탈 AI 연구소 기본 업무 공간 (주간 보고, 검증 규칙, 공통 파일 관리 등)
- **노이즈 필터링 (Drop Rule)**:
  - "Daily Scrum", "개인 주간 업무 보고", 내용 없는 링크 스크랩 문서는 완전히 무시(Drop)합니다.
- **타겟 폴더 매핑 가이드 (Location)**:
  - 제공받은 `context_tree` 내에서 `연구소 공통`, `업무 일지`, `검증/테스트` 성격의 폴더를 찾아서 해당 ID를 반환하세요.
- **레이블링 가이드 (Tagging)**:
  - 공통 관리 문서이므로 본문 성격에 따라 다음 중 최소 1개 이상을 반드시 부착하세요.
  - `group-ai` (기본), `doctype-report` (보고서류), `doctype-rule` (검증 규칙 등)

---

## 2. [WND] 스페이스 룰
- **스페이스 성격**: Dynamic Navigation 프로젝트 (SDP, 기능 요구사항, State Diagram, 마일스톤 등)
- **노이즈 필터링 (Drop Rule)**:
  - 본문이 전혀 없이 "Revision" 등 단순 이력만 있는 페이지나 알림성 글은 제외합니다.
- **타겟 폴더 매핑 가이드 (Location)**:
  - 제공받은 `context_tree` 내에서 반드시 `과제 관리` > `Dynamic Navigation` 하위 폴더 중 성격에 맞는 폴더(산출물, 기획, 회의록 등)를 찾아서 매핑하세요.
- **레이블링 가이드 (Tagging)**:
  - 이 스페이스 출신 문서는 **반드시** `project-wnd` 태그를 부착해야 합니다.
  - 추가로 성격에 따라 `doctype-spec` (명세서), `doctype-plan` (계획서)을 병행 표기하세요.

---

## 3. [Device] 스페이스 룰
- **스페이스 성격**: 덴탈 AI 연구소 개발PM팀 HW 관련 업무 (환자용 트레이, 풋 스위치, IR 카메라 부품/업체 조사 등)
- **노이즈 필터링 (Drop Rule)**:
  - 본문 텍스트 없이 제목만 "DN_XXX 업체" 식으로 적혀있고 내용이 텅 빈 문서는 보류(Drop) 처리합니다.
- **타겟 폴더 매핑 가이드 (Location)**:
  - 제공받은 `context_tree` 내에서 `개발PM팀`, `하드웨어`, `디바이스`, `기구설계`, `Dynamic Navigation`, `Implant Robot` 등의 키워드가 포함된 폴더 계층을 최우선으로 탐색하여 매핑하세요.
- **레이블링 가이드 (Tagging)**:
  - 이 스페이스 출신 문서는 **반드시** `group-device` 혹은 `project-navigation` 혹은 `project-implant-robot` 태그를 부착해야 합니다.
  - 업체/부품 조사 문서일 경우 `doctype-survey`, 도면/산출물일 경우 `doctype-hw` 를 추가하세요.

---

## 4. [SmileArch] 스페이스 룰
- **스페이스 성격**: SmileArch Design SW 알고리즘 및 딥러닝 연구 (Diffusion 모델, STL 신경관 기반 추정, 기술 스택 조사 등)
- **노이즈 필터링 (Drop Rule)**:
  - 의미론적 해석이 불가능한 파이썬 에러 로그 덤프, 해결되지 않은 이슈 초안 등은 무시합니다.
- **타겟 폴더 매핑 가이드 (Location)**:
  - 제공받은 `context_tree` 내에서 `과제 관리` > `SmileArch` 하위 폴더나, `AI 연구/알고리즘` 관련 폴더를 찾아서 매핑하세요.
- **레이블링 가이드 (Tagging)**:
  - 이 스페이스 출신 문서는 **반드시** `project-smilearch` 태그를 부착해야 합니다.
  - 논문이나 기술 스택 조사일 경우 `doctype-research`, 모델 학습 결과일 경우 `doctype-model` 태그를 추가하세요.
