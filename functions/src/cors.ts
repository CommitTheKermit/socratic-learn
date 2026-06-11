// 모든 Function 의 CORS 허용 origin 화이트리스트(전역 단일 출처).
// 기존 `cors: true`(전체 개방) 대신 prod 도메인 + 로컬 개발 origin 만 허용한다.
// firebase-functions v2 onRequest 의 cors 옵션은 (string | RegExp)[] 를 받는다.
export const CORS_ORIGINS: (string | RegExp)[] = [
  // 배포(Firebase Hosting 기본 2개 도메인)
  "https://socratic-learn-web.web.app",
  "https://socratic-learn-web.firebaseapp.com",
  // 로컬 개발/E2E(Vite dev server 는 포트가 5173, 5174… 로 바뀔 수 있어 정규식 허용)
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
];
