# Confluence Management Agent

사내 Confluence 스페이스를 자동화·관리하는 에이전트 프로젝트

## 목적

- 사내 Confluence 시스템의 구조화 및 MPS(Mission/Performance objectives/Strategy) 워크플로우 지원
- LLM 기반 에이전트를 통해 Confluence 페이지 자동 분류, 레이블링, 정책 준수 모니터링

## 현재 진행 상태

### 1단계: 기존 스페이스 분석 (진행 중)

SD 스페이스(Digital R&D Center)의 구조를 분석하여 문제점을 파악했습니다.

**핵심 발견:**

| 항목 | 수치 |
|------|------|
| 총 페이지 | 661 |
| 총 폴더 | 75 |
| 레이블 사용률 | **0%** |
| 최대 폴더 중첩 | 3단계 |
| Archived 빈 루트 | 12개 |

**주요 문제점:**
- 레이블/태그 미사용 → RAG 활용 불가
- 폴더와 페이지 혼용 → API 자동화 시 구조적 문제
- MPS 문서가 4개 팀별로 분산 (AI/Device/SW/Solution)
- 개발 문서와 MPS 문서 혼재
- 명명 규칙 불일치

상세 분석: [reference/SD_space_analysis.md](reference/SD_space_analysis.md)

### 2단계: 신규 스페이스 설계 (예정)

- 기존 분석 기반으로新규 스페이스(AA)의 계층 구조 설계
- 레이블/태그 체계 수립
- MPS 전용 구조 설계

### 3단계: 자동화 구축 (예정)

- 사내 Dify 시스템 활용 Confluence 관리 에이전트
- 기능: 페이지 위치 검증, 자동 태깅, 만료 알림

## 디렉터리 구조

```
confluence_mgt_agent/
├── CLAUDE.md              # Claude Code 가이드
├── README.md              # 이 파일
├── reference/             # 참고 자료
│   ├── ToDo.md            # 프로젝트 할일
│   ├── SD_space_analysis.md  # SD 스페이스 분석 보고서
│   └── *.json             # Confluence API 원본 데이터
└── scripts/               # 분석 스크립트
    └── analyze_*.js       # 스페이스 구조 분석 스크립트
```

## 환경

- **Confluence**: Atlassian Cloud (`neobiotech.atlassian.net`)
- **API**: Confluence REST API v2 (최신) / v1 (레거시)
- **LLM 시스템**: 사내 Dify 기반
