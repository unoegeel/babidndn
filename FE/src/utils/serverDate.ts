/**
 * 서버 시각 문자열 파싱
 *
 * 백엔드는 시간대 정보가 없는 UTC 시각("2026-07-30T09:27:20")을 내려주므로,
 * 그대로 new Date() 에 넣으면 로컬 시각으로 오해되어 9시간(KST 기준) 어긋납니다.
 * 시간대 표기가 없으면 UTC 로 간주해 파싱합니다.
 */
export function parseServerDate(iso: string): Date {
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(iso);
  return new Date(hasTimezone ? iso : `${iso}Z`);
}
