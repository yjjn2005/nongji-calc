# 농지 전수조사 대응 앱 (nongji-calc)

> **2026.9.21 업데이트**: 농식품부 보완 대책(처분의무 수년 유예 추진 — '농지이용 정상화를 위한 특별조치법' 가칭, 미등기 상속농지 대리경작자 지정, 공유농지 과반 지분 위탁, 불법 전용시설 양성화 절차) 반영 — 가이드 탭 1·4·5·6·8·9번 항목 및 임대 진단·체크리스트 업데이트.

가이드 + 양도세 비교(2027/2028) + 이행강제금 누적 + 매수청구 vs 대기 매각 + 임대 진단 + 대응 체크리스트.
입력값과 체크 상태는 기기에 저장되며, PIN 동기화를 켜면 PC·아이폰·아이패드 어디서든 같은 데이터가 유지됩니다.

## 1. GitHub Pages 배포

```bash
cd nongji-calc
git init
git add .
git commit -m "농지 전수조사 대응 앱"
git branch -M main
git remote add origin https://github.com/yjjn2005/nongji-calc.git
git push -u origin main
```

GitHub 저장소 → Settings → Pages → Source: `Deploy from a branch`, Branch: `main` / `(root)` → Save.
약 1분 후 https://yjjn2005.github.io/nongji-calc/ 에서 접속됩니다.

## 2. 동기화 서버 배포 (Cloudflare Worker — gicho-calc-api와 동일 방식)

1. Cloudflare 대시보드 → Workers & Pages → Create Worker → 이름 `nongji-calc-api`
2. 코드에 `worker.js` 내용 붙여넣고 Deploy
3. Worker → Settings → Bindings → KV Namespace 추가
   - Variable name: `NONGJI_SYNC`
   - KV namespace: 새로 생성 (이름 `NONGJI_SYNC`)
4. 다시 Deploy → 주소 확인: `https://nongji-calc-api.<계정>.workers.dev`

### 앱에서 연결
각 기기에서 앱 → **설정** 탭:
- PIN: 기기들끼리 동일한 4자리 이상 (예: 결혼기념일 등 남이 추측 못할 값)
- 서버 주소: 위 Worker 주소
- **동기화 켜기** → 첫 기기에서 "지금 서버로 올리기", 나머지 기기는 켜는 순간 자동 수신

입력을 바꾸면 1.5초 후 자동 저장되고, 앱을 열 때마다 서버의 최신본을 받아옵니다.
서버 없이 쓰려면 설정 탭의 **내보내기/가져오기**(클립보드)로 수동 이동할 수 있습니다.

## 3. 파일

| 파일 | 용도 |
|---|---|
| `index.html` | 앱 전체 (단일 파일) |
| `worker.js` | Cloudflare Worker 동기화 API (`GET/PUT /sync/:pin`) |

## 4. 계산 기준

- 양도세: 기본세율 8단계 누진 + 비사업용 중과(현행 +10%p → 2028년 +20%p), 장특공 연 2%·최대 30%(2028년 비사업용 폐지), 지방소득세 10%. 매일경제 2026.8.27 사례(15년·차익 2억: 5,108만 → 1억407만원)와 일치 검증.
- 상속 특례: 상속 3년 내 양도·피상속인 8년 재촌자경·농지은행 8년 위탁 → 사업용.
- 이행강제금: max(공시지가, 감정가) × 25% / 년.
- 농지법: 법률 제21798호(2026.8.28 시행), 상속·이농 위탁 의무는 경과조치로 기존 소유자 미적용.

개별 사안은 세무사·변호사 확인이 필요합니다. — 유앤김패밀리
