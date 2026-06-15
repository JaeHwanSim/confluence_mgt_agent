# SD 스페이스 (Digital R&D Center) 구조 분석 보고서

> 분석일: 2026-06-15 | 총 페이지: 661개 | 총 폴더: 75개

---

## 1. 전체 구조 개요

### 핵심 발견: 복잡한 폴더 + 페이지 혼용 구조

SD 스페이스는 **페이지(661개)**와 **폴더(75개)**를 혼용합니다. 폴더끼리도 **최대 3단계 중첩**됩니다. Confluence v1 API는 폴더를 ancestors에 포함하지 않아, 폴더 기반 구조를 자동으로 파악하기 어렵습니다.

### 루트 구조

```
📁 SD 스페이스 (Digital R&D Center, homepage id:98524)
│
├── 📄 Daily Scrum (homepage 하위 유일한 페이지)
│   ├── 2024-Daily Scrum
│   └── 2025-Daily Scrum
│
├── 📁 정부과제 ────────────────────── 루트 폴더
│   ├── 📁 2026 강원지역혁신클러스터
│   ├── 📁 2026 글로벌기업산업기술연계
│   ├── 📁 2026 중기부 소부장
│   └── 📁 지역혁신클러스터 육성 과제
│       ├── 기획 단계 (6개: 사이버보안, 위험관리, 형상관리 등)
│       ├── 구현 및 검증 단계
│       └── 위험 관리 및 릴리스 단계
│
├── 📁 AI ─────────────────────────── 루트 폴더
│   ├── 📁 Agent2Agent (2개: A2A, A2A & MCP)
│   ├── 📁 AI 과제 관리 시스템 (5개)
│   │   └── 📁 개발효율화-자율개발시스템 (4개)
│   │       └── 📁 참고문서 (5개)
│   ├── 📁 AI Evangelist (6개)
│   ├── 📁 AI TF (2개)
│   │   ├── 📁 AI TF - Data (9개: ERP, 영업AI, 과제AI 등)
│   │   ├── 📁 AI TF - UX/UI 기획 및 디자인 (5개)
│   │   │   └── 📁 UX/UI 방향성 보고서 (4개)
│   │   └── 📁 Meeting (6개)
│   ├── 📁 MCP (4개: API, REST, RPC, MCP)
│   ├── 📁 R&D AI (10개: RAG, Fine-tuning 등)
│   ├── 📁 운영 이관 관련 문서 (3개)
│   └── sLM, Deep Learning, CEO AI Platform 등 (14개 페이지)
│
├── 📁 Survey ──────────────────────── 루트 폴더
│   ├── 📁 Application Framework (4개: Electron, 웹앱 vs 네이티브)
│   ├── 📁 Briefing session (1개)
│   ├── 📁 Cephalometric Analysis SW (1개)
│   ├── 📁 Checklist (2개)
│   ├── 📁 Clinic (2개)
│   ├── 📁 Dental Essentials (2개)
│   ├── 📁 Devices (3개)
│   ├── 📁 Exhibition (4개: SIDEX, IDS, KDX, GAMEX 등)
│   │   ├── 📁 IDS 2025 (3개)
│   │   └── 📁 KDX 2025 (4개)
│   ├── 📁 Megazen Full Mouth Solution (4개)
│   ├── 📁 Paper (1개)
│   ├── 📁 Patents (2개)
│   ├── 📁 Robot (5개)
│   ├── 📁 Seminar (7개)
│   ├── 📁 Software Engineering (8개)
│   ├── 📁 업무 자동화 솔루션 (1개)
│   ├── 📁 AI 의료 영상 분석 모델 (1개)
│   ├── 📁 Vision/3D Graphics (9개)
│   │   └── 📁 정합 고도화 (4개)
│   ├── 기공 플랫폼
│   └── 특허 사무소 비교
│
├── 📁 Report ──────────────────────── 루트 폴더
│   ├── 📁 디지털개발실 주간 업무 공유 (9개)
│   ├── 📁 MPS-Center ────────────── 2단계
│   │   ├── 📁 AI MPS (9개: 월간/연간)
│   │   ├── 📁 Device MPS (10개)
│   │   ├── 📁 SW MPS (11개)
│   │   ├── 📁 Solution MPS (5개)
│   │   └── 📁 R&D MPS (1개)
│   ├── 📁 Weekly MPS Evaluation & Planning
│   ├── Monthly
│   ├── Sketches
│   └── MPS 작성 Process
│
├── 📁 Tiny Projects ──────────────── 루트 폴더
│   ├── 📁 CT Viewer (4개)
│   ├── 📁 Implant Library 개발 (1개)
│   └── All on X, DICOM Viewer, Trend Project 등 (11개 페이지)
│
├── 📁 How To Develop👌 ───────────── 루트 폴더 (17개)
│   └── Flutter, Dart, Electron, Git, UML 등 개발 문서
│
├── 📁 Old ─────────────────────────── 루트 폴더
│   ├── 📁 R&D MPS (1개)
│   ├── 📁 Solution MPS (5개)
│   └── Development Strategy, Neo Plan 등 (3개 페이지)
│
├── 📁 Neo Robot-Guided Dental Implant Surgery (페이지, 루트)
│   ├── ChapGPT 기반 대화형 로봇 개발 (8개)
│   ├── IR Marker Tracking Robot Development (4개)
│   ├── Requirementa (2개)
│   └── Roadmap
│
├── 📄 Archived Robot vLEg (빈 루트)
├── 📄 Archived AI KdeG (빈 루트)
├── 📄 Archived Software Engineering fyXV (빈 루트)
├── 📄 Archived Survey nvXh (빈 루트)
├── 📄 Archived Vision/3D Graphics liqE (빈 루트)
├── 📄 Archived Report qlpR (빈 루트)
├── 📄 Archived Application Framework lcxE (빈 루트)
├── 📄 Archived How To Develop👌 CLYR (빈 루트)
├── 📄 Archived Tiny Projects BGQS (빈 루트)
├── 📄 Archived Seminar EwTm (빈 루트)
├── 📄 Archived Neo Wiki bqYs (빈 루트)
└── 📄 Archived 24-NeoRobot Weekly History OmbM (빈 루트)
```

---

## 2. 발견된 문제점

### 🔴 문제 1: 레이블/태그 0% — RAG 활용 불가

**661개 페이지 중 레이블이 있는 페이지: 0개 (0%)**

- LLM이 어떤 페이지를 참조해야 할지 판별할 수 없음
- 검색 정확도에 직접적 영향
- 카테고리 분류가 불가능

### 🔴 문제 2: 폴더 3중 중첩 — 구조 복잡성

- 75개 폴더가 최대 3단계로 중첩
- 루트 폴더 7개 (정부과제, AI, Survey, Report, Tiny Projects, How To Develop, Old)
- Survey 하위에만 18개 하위 폴더
- AI 하위에만 8개 하위 폴더 (일부 2단계 중첩)
- v1 API로는 이 구조를 자동 파악 불가

### 🔴 문제 3: MPS 문서 구조 혼란

MPS가 **4개 팀별로 분산**되어 있고, MPS-Center 폴더 안에 있음:

```
📁 Report > MPS-Center
├── 📁 AI MPS (9개: 9월~12월 월간 + '26 연간/월간)
├── 📁 Device MPS (10개: 7월~12월 월간 + '26 연간/월간)
├── 📁 SW MPS (11개: 7월~12월 월간 + '26 연간/월간)
├── 📁 Solution MPS (5개: 8월~11월 월간 + '26 연간)
└── 📁 R&D MPS (1개)
```

**문제:**
- 같은 월의 MPS가 4개 폴더에 분산 → 비교/분석 어려움
- Old 폴더에도 R&D MPS, Solution MPS가 중복 존재
- 명명 불일치: "SW-7월 월간 MPS" vs "Device - 7월 월간 MPS"

### 🟡 문제 4: 12개 Archived 루트 페이지 — 루트 오염

- "Archived" 접두사가 붙은 12개 페이지가 루트에 그대로 존재
- 각각 하위 페이지 0개 (빈 컨테이너)
- 실제 유효 트리 구조가 희석됨

### 🟡 문제 5: 개발 문서와 MPS 문서 혼재

MPS(업무 관리) 문서와 기술 개발 문서가 같은 스페이스에 공존:
- 📁 Survey: 기술 조사 + MPS 관련
- 📁 AI: AI 기술 + MPS + 과제 관리
- 📁 Report: 업무 보고 + MPS

### 🟡 문제 6: 명명 규칙 불일치

- 영문/한글 혼용: "IR Marker Tracking Robot Development" vs "음성 명령 상시 Listening..."
- MPS 명명: 공백 차이, 팀 접두사 불일치
- 주간 기록: 날짜 형식 비표준

---

## 3. 핵심 통계 요약

| 항목 | 수치 |
|------|------|
| 총 페이지 | 661 |
| 총 폴더 | **75** |
| 루트 폴더 | 7 (정부과제, AI, Survey, Report, Tiny Projects, How To Develop, Old) |
| 레이블 사용률 | **0%** |
| 루트 항목 | 14 (1 homepage + 1 Neo Robot + 7 루트폴더 + 1 Daily Scrum + 12 Archived) |
| 최대 폴더 중첩 | 3단계 (Survey > Exhibition > IDS 2025 등) |
| MPS 관련 폴더 | 5 (AI MPS, Device MPS, SW MPS, Solution MPS, R&D MPS) |
| Archived 빈 루트 | 12개 |

---

## 4. 신규 스페이스(AA) 설계 시 고려사항

1. **레이블 체계 필수 설계** — 프로젝트/팀/문서유형/상태별 태그
2. **페이지 전용 구조** — 폴더 혼용 지양 (v1 API 호환성, 자동화 용이)
3. **최대 깊이 3~4단계 제한** — RAG 효율성 위해
4. **MPS 통합 구조** — 팀별 분산 지양, 월별/주별 계층으로 통합
5. **개발 문서와 MPS 문서 분리** — 명확한 경로 구분
6. **Archived 스페이스 별도 처리** — 루트에서 격리
7. **명명 규칙 표준화** — [팀-기간-문서유형] 형식 등
