# Confluence Management Agent

사내 Confluence 스페이스를 자동화·관리하는 에이전트 프로젝트

## 목적

- 사내 Confluence 시스템의 구조화 및 MPS(Mission/Performance objectives/Strategy) 워크플로우 지원
- LLM 기반 에이전트를 통해 Confluence 페이지 자동 분류, 레이블링, 정책 준수 모니터링

## 현재 진행 상태

### 1단계: 기존 스페이스 분석 (완료)
- SD 스페이스 분석 완료 및 133개 이관 대상 페이지 선별
- 상세 분석: [reference/SD_space_analysis.md](reference/SD_space_analysis.md)

### 2단계: 신규 스페이스 설계 및 생성 (완료)
- AA 스페이스 계층 구조 설계 및 생성 완료 (`npm run setup:aa`)
- Confluence Cloud 정책에 맞춘 고유 페이지 제목 적용 (예: `'25 연구소` -> `25 연구소`)

### 3단계: 컨텐츠 마이그레이션 (진행 중)
- V2 API 기반의 마이그레이션 스크립트 개발 (`npm run migrate:all`)
- **해결된 주요 이슈**:
  - AWS S3 첨부파일 다운로드 리다이렉트 400 에러 및 REST API 다운로드 엔드포인트 401 에러 해결
  - 이미지 파일 정상 다운로드 및 재업로드 처리, 영상 파일은 원본 링크 유지
  - 라벨 매핑 오류 수정 (콜론(`:`) 제외, 하이픈(`-`) 사용)

### 4단계: 자동화 유지보수 구축 (예정)
- 사내 Dify 시스템 활용 Confluence 관리 에이전트 구축

## 스크립트 사용법

```bash
npm run setup:aa       # AA 스페이스 기본 폴더 구조 생성
npm run migrate:all    # SD 스페이스에서 AA 스페이스로 페이지 및 이미지 이관
npm run clean:aa       # 테스트용 불완전 마이그레이션 페이지 일괄 삭제
```

## 디렉터리 구조

```
confluence_mgt_agent/
├── CLAUDE.md              # Claude Code 가이드
├── README.md              # 이 파일
├── package.json           # npm 스크립트
├── reference/             # 참고 자료 및 설계 문서
│   ├── ToDo.md            
│   ├── AA_space_design_plan.md
│   └── migration_candidates.md
└── scripts/               # 실행 스크립트
    ├── analyze_sd_v2_full.js
    ├── setup_aa_space.js
    ├── migrate_to_aa_space.js
    └── clean_aa_space.js
```

## 환경

- **Confluence**: Atlassian Cloud (`neobiotech.atlassian.net`)
- **API**: Confluence REST API v2 (최신) / v1 (레거시)
- **LLM 시스템**: 사내 Dify 기반
