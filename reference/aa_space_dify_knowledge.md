# AA Space Document Classification Rules (for LLM / Dify)

This document is the Knowledge Base for the Confluence Automation Agent. 
Use these rules to determine the `target_folder_id` and `labels` for any given Confluence page.

## 1. Validation Rule (is_valid)

A document MUST satisfy ALL the following conditions to be `is_valid: true`:
1. It is NOT a daily log or scrum note (e.g., "Daily Scrum", "일일 회의").
2. It is NOT an empty or meaningless page.
3. It contains actual work status, MPS planning/evaluation, technical survey, or project tracking information.
4. If it's a Weekly/Monthly report, it must be from the year 2025 or later.

If the document does not meet these criteria, return `is_valid: false`.

## 2. Folder Mapping Rules (target_folder_id)

Identify the category of the document and assign the EXACT `target_folder_id` from the list below.

### 📁 MPS 이력 (MPS Planning & Evaluation)
*   **연간 MPS** (`433356856`) : Annual MPS plans (e.g., "[AI] 2026 연간 MPS")
*   **2025년 월간/주간 MPS**
    *   25 연구소 (`433913879`) : Center-wide reports
    *   25 AI 과제 (`434929722`) : AI team MPS
    *   25 SW 과제 (`434864175`) : SW team MPS
    *   25 Device 과제 (`434864195`) : Device team MPS
*   **2026년 월간/주간 MPS**
    *   26 AI 과제 (`434864215`)
    *   26 Device 과제 (`435028020`)
    *   (If a specific team folder is missing, use `needs_new_category: true`)

### 📁 프로젝트 현황 (Project Status & Roadmaps)
Documents related to specific project progress, roadmaps, or government grants.
*   **정부과제** (`434339867`) : E.g., 강원지역혁신클러스터, 글로벌기업, 소부장
*   **AI 프로젝트** (`433815584`) : AI System, RAG, Autonomous Dev
*   **SW 프로젝트** (`433913899`) : SW Team projects
*   **Device 프로젝트** (`434307101`) : Neo Robot-Guided, Hardware control

### 📁 기술 조사 & 인사이트 (Technical Surveys & Insights)
Research, reviews, and market analysis.
*   **AI·ML 기술** (`434307121`) : LLM, RAG, Fine-tuning, Vision AI research
*   **제품·시장 조사** (`434143257`) : Exhibitions (IDS, KDX), Market trends
*   **특허·논문 분석** (`434274307`) : Paper reviews, Patent analysis
*   **기술 표준 & 아키텍처** (`433586226`) : Software engineering standards

### 📁 팀 운영 가이드 (Team Guidelines)
*   **팀 운영 가이드** (`434307081`) : Branch strategies, CI/CD, MPS writing guides

---

## 3. Labeling Rules (labels)

You MUST assign at least 3 labels to every valid page as an array of strings. Do NOT use colons (`:`). Use hyphens (`-`) only.

### 3-1. Group Label (Choose 1 or more)
*   `group-center` : General center/research institute
*   `group-ai` : AI team/project
*   `group-sw` : SW team/project
*   `group-device` : Device team/project

### 3-2. Document Type Label (Choose 1)
*   `doctype-mps-annual` : Annual MPS
*   `doctype-mps-monthly` : Monthly MPS
*   `doctype-mps-weekly` : Weekly MPS
*   `doctype-project-status` : Project status or roadmap
*   `doctype-tech-survey` : Technical research / survey
*   `doctype-market-survey` : Market / competitor analysis
*   `doctype-guideline` : Team guidelines or process
*   `doctype-patent` : Patent or paper review
*   `doctype-gov-project` : Government grant project

### 3-3. Year Label (Choose 1)
*   `year-2024`
*   `year-2025`
*   `year-2026`

### 3-4. Status Label (Choose 1 or more)
*   `status-active` : Ongoing or valid
*   `status-completed` : Finished project or past MPS
*   `status-evergreen` : Always valid (like guidelines)
*   `status-review-needed` : If you think the info is too old

---

## 4. Exception Handling (needs_new_category)

If the document is `is_valid: true` but you absolutely CANNOT find a suitable `target_folder_id` in the lists above (e.g., a completely new team or a totally different topic like "HR/Welfare"), do NOT guess.
Set `needs_new_category: true`, leave `target_folder_id` empty, and provide a `suggested_new_folder` and `reason` in your JSON response.
