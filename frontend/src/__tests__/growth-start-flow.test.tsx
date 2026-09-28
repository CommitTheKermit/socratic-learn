import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../App";
import { logEvent } from "../lib/analytics";

const { ensureSignedIn, getReadymadeRoadmap } = vi.hoisted(() => ({ ensureSignedIn: vi.fn(), getReadymadeRoadmap: vi.fn() }));
vi.mock("../state/useAuth", () => ({ useAuth: () => ({ user: null, loading: false, ensureSignedIn, login: vi.fn(), logout: vi.fn() }) }));
vi.mock("../api/readymadeRoadmapApi", () => ({
  listReadymadeRoadmaps: vi.fn(async () => [{ id: "demo", subject: "안드로이드", title: "테스트 로드맵", stepTitles: [] }]),
  getReadymadeRoadmap,
}));
vi.mock("../api/sessionApi", () => ({
  listSessionsRemote: vi.fn(async () => []), getSessionRemote: vi.fn(async () => null),
  saveSessionRemote: vi.fn(async () => {}), deleteSessionRemote: vi.fn(async () => {}),
}));
vi.mock("../api/claudeContent", () => ({
  validateInput: vi.fn(async () => true), generateProbeQuestions: vi.fn(async () => []),
  ClaudeContentError: class extends Error {},
}));

beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
  ensureSignedIn.mockResolvedValue(undefined); getReadymadeRoadmap.mockResolvedValue(null);
});
function openHome() {
  render(<MemoryRouter initialEntries={["/?utm_source=threads&utm_medium=organic_social&utm_campaign=relaunch_202609&utm_content=question_01"]}><App /></MemoryRouter>);
}
it("개념 시작 시도를 인증 전에 기록하고 성공한 새 학습을 구분한다", async () => {
  openHome();
  fireEvent.change(screen.getByPlaceholderText("배우고 싶은 개념을 입력해서 시작해보세요"), { target: { value: "코루틴" } });
  fireEvent.click(screen.getByRole("button", { name: "학습 시작" }));
  await waitFor(() => expect(logEvent).toHaveBeenCalledWith("sl_learning_created", expect.objectContaining({ entry_method: "concept", campaign_source: "threads" })));
  const names = vi.mocked(logEvent).mock.calls.map(call => call[0]);
  expect(names.indexOf("sl_start_attempt")).toBeLessThan(names.indexOf("sl_learning_created"));
});
it("인증 실패는 성공한 학습 생성으로 세지 않고 기존 화면에 오류를 보여준다", async () => {
  ensureSignedIn.mockRejectedValue(new Error("offline"));
  openHome();
  fireEvent.change(screen.getByPlaceholderText("배우고 싶은 개념을 입력해서 시작해보세요"), { target: { value: "코루틴" } });
  fireEvent.click(screen.getByRole("button", { name: "학습 시작" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("익명 인증에 실패"));
  expect(logEvent).toHaveBeenCalledWith("sl_start_failed", expect.objectContaining({ reason: "auth", entry_method: "concept" }));
  expect(logEvent).not.toHaveBeenCalledWith("sl_learning_created", expect.anything());
});
it("로드맵 조회 실패도 시작 시도 뒤의 별도 실패로 기록한다", async () => {
  getReadymadeRoadmap.mockRejectedValue(new Error("offline"));
  openHome();
  fireEvent.click(await screen.findByRole("button", { name: "시작: 테스트 로드맵" }));
  await waitFor(() => expect(logEvent).toHaveBeenCalledWith("sl_start_failed", expect.objectContaining({ reason: "roadmap_load", entry_method: "roadmap" })));
  expect(logEvent).not.toHaveBeenCalledWith("sl_learning_created", expect.anything());
});
