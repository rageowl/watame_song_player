# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YouTube 기반 음악 플레이어 웹앱. 클립별 개별 볼륨 설정과 중첩 재생목록을 지원한다.

## Running the App

빌드 시스템 없음. `index.html`을 브라우저에서 직접 열면 된다. 외부 CDN(YouTube IFrame API, Google Sheets API, jszip)이 필요해 인터넷 연결 필수.

## Architecture

`index.html` (324줄 HTML만) + `js/` 폴더 + `styles.css`로 구성된 SPA.

### JS 파일 구조 (로드 순서)
| 파일 | 줄수 | 내용 |
|------|------|------|
| `js/globals.js` | 77 | 전역 변수/상수 선언 |
| `js/utils.js` | 126 | 순수 유틸 함수 (시간변환, base64, shuffle 등) |
| `js/ui-base.js` | 246 | DivBase, PopupMenu, PopupMenuItem 클래스 |
| `js/multicolumn.js` | 1482 | MultiColumnList 클래스 (테이블 컴포넌트) |
| `js/data-loader.js` | 250 | readData*, settings_AddURL |
| `js/playlist.js` | 1649 | 재생목록 CRUD, 재생 컨텍스트, YouTube 연동 |
| `js/controls.js` | 495 | 재생 컨트롤, 볼륨, 검색 이벤트 핸들러 |
| `js/export-import.js` | 141 | exportList, importList, TestClipTime |
| `js/app-init.js` | 807 | init() 함수 (테이블/이벤트 초기화) |

### 외부 의존성 (CDN)
- YouTube IFrame API — 영상 재생
- Google Sheets API — 클립 데이터 소스
- jszip — import/export 데이터 압축
- Google Charts API

### 데이터 저장
- `watamePlayer_PlayList` — 재생목록 (localStorage)
- `watamePlayer_Volumes` — 클립별 개별 볼륨 (localStorage)
- `watamePlayer_settings` — 앱 설정, Google Sheet URL 포함 (localStorage)

### 주요 전역 변수
- `playListData` — 재생목록 데이터
- `individualVolumeData` — Map, 클립별 볼륨
- `videoClipList` — Google Sheets에서 불러온 클립 목록
- `playContextStack` — 중첩 재생목록 재생 상태 스택
- `viewContextStack` — 중첩 재생목록 뷰 상태 스택

### 주요 UI 클래스
- `DivBase` — 모든 DOM 컴포넌트의 기반 클래스
- `MultiColumnList` — 정렬/필터/드래그앤드롭 지원 테이블 컴포넌트
- `PopupMenu` / `PopupMenuItem` — 컨텍스트 메뉴

### 주요 함수 위치 (index.html 내)
- `init()` ~line 2096 — 앱 초기화 진입점 (onload 호출)
- `readData()` ~line 1945 — localStorage + Google Sheets 데이터 로딩
- `playVideo()` ~line 3438 — YouTube 플레이어 연동
- `exportList()` / `importList()` ~line 5065 — 데이터 내보내기/가져오기

### 코드 패턴
- 클래스보다 독립 함수 위주
- 이벤트 기반, 직접 DOM 조작 (가상 DOM 없음)
- 콜백에서 `obj` 클로저 패턴 다수 사용
- localStorage에 동기 저장
