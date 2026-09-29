import { StrictMode } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter } from "react-router-dom";
import { GrowthEntryTracker } from "./GrowthEntryTracker";
import { logEvent } from "../lib/analytics";

beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); });
it("StrictMode에서 중복 방문을 세지 않고 소개에서 홈으로 캠페인을 이어간다", () => {
  render(<StrictMode><MemoryRouter initialEntries={["/landing?utm_source=instagram&utm_medium=organic_social&utm_campaign=relaunch_202609&utm_content=carousel_01"]}>
    <GrowthEntryTracker /><Link to="/">시작</Link>
  </MemoryRouter></StrictMode>);
  expect(logEvent).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByText("시작"));
  expect(logEvent).toHaveBeenCalledTimes(2);
  expect(logEvent).toHaveBeenLastCalledWith("sl_entry_view", expect.objectContaining({ entry_page: "home", campaign_source: "instagram" }));
});
it("학습 URL의 재방문을 신규 입구 방문으로 세지 않는다", () => {
  render(<MemoryRouter initialEntries={["/s/test/learn/0"]}><GrowthEntryTracker /></MemoryRouter>);
  expect(logEvent).not.toHaveBeenCalled();
});
