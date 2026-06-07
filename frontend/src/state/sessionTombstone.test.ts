import { describe, test, expect, beforeEach } from "vitest";
import {
  SESSIONS_TOMBSTONE_KEY,
  listTombstones,
  addTombstone,
  removeTombstone,
} from "./sessionTombstone";

beforeEach(() => {
  localStorage.clear();
});

describe("sessionTombstone - 낙관적 삭제 표식", () => {
  test("키 없으면 빈 집합", () => {
    expect(listTombstones().size).toBe(0);
  });

  test("addTombstone 후 listTombstones 에 포함, 다른 id 는 미포함", () => {
    addTombstone("s1");
    expect(listTombstones().has("s1")).toBe(true);
    expect(listTombstones().has("s2")).toBe(false);
  });

  test("addTombstone 은 중복을 만들지 않는다", () => {
    addTombstone("s1");
    addTombstone("s1");
    expect([...listTombstones()]).toEqual(["s1"]);
  });

  test("removeTombstone 후 더 이상 포함되지 않는다", () => {
    addTombstone("s1");
    addTombstone("s2");
    removeTombstone("s1");
    expect(listTombstones().has("s1")).toBe(false);
    expect(listTombstones().has("s2")).toBe(true);
  });

  test("removeTombstone 대상이 없으면 변화 없음", () => {
    addTombstone("s1");
    removeTombstone("없는id");
    expect([...listTombstones()]).toEqual(["s1"]);
  });

  test("localStorage 영속 - 별도 호출에서도 유지된다", () => {
    addTombstone("s1");
    // 직접 raw 확인: JSON 배열로 저장됨
    expect(JSON.parse(localStorage.getItem(SESSIONS_TOMBSTONE_KEY) as string)).toEqual(["s1"]);
  });

  test("손상된 JSON 은 빈 집합으로 폴백", () => {
    localStorage.setItem(SESSIONS_TOMBSTONE_KEY, "{not json");
    expect(listTombstones().size).toBe(0);
  });

  test("배열이 아니거나 문자열 아닌 항목은 제외", () => {
    localStorage.setItem(SESSIONS_TOMBSTONE_KEY, JSON.stringify(["ok", 1, null, "", "ok2"]));
    expect([...listTombstones()].sort()).toEqual(["ok", "ok2"]);
  });
});
