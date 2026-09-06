# 구현 결정

기준: DEVELOPMENT_ROADMAP.txt 전체. 아래 합의 사항이 원문보다 우선한다.

- Astro 7.3.1 + 공식 @astrojs/markdown-remark 7.3.0, markdown.processor 사용.
- 기능은 최신 main에서 feature/로 분기하고 순차 완료. dev와 main에 각각 --no-ff 병합.
- main 병합 전에 main을 작업 브랜치에 병합하고 검증. dev 자체는 main에 병합하지 않는다.
- Conventional Commits 영문. 초기 커밋은 chore: initial commit.
- 샘플 글 2~3개 유지. 테스트 fixture는 실제 콘텐츠와 분리.
- OG에도 확대 금지. 작은 원본은 비율을 유지한 작은 OG. SVG 썸네일은 OG/JSON-LD image 생략.
- 서로 다른 taxonomy 이름의 slug 충돌은 빌드 실패.
- 미래 날짜도 draft: false이면 공개. 예약 발행 없음.
- directive 속성은 표준 한 줄 문법. 다중 행 예제는 수정.
- 한국어 문서, Node 24.20.0, pnpm 11.25.0, lockfile 고정.
- 실제 배포와 빈 콘텐츠 상태 검증을 완료 조건에 포함.
