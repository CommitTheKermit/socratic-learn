import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { captureCampaign } from "../lib/growthMetrics";
import { logEvent } from "../lib/analytics";

/** 소개 화면과 홈을 구분해 인증 전 방문도 측정한다. */
export function GrowthEntryTracker() {
  const { pathname, search, key } = useLocation();
  const lastLocation = useRef<string>();
  useEffect(() => {
    if (pathname !== "/" && pathname !== "/landing") return;
    const location = `${key}:${pathname}:${search}`;
    if (lastLocation.current === location) return;
    lastLocation.current = location;
    logEvent("sl_entry_view", {
      ...captureCampaign(search), entry_page: pathname === "/" ? "home" : "landing",
    });
  }, [pathname, search, key]);
  return null;
}
