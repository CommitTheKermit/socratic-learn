import { useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CameraAnswer } from "./CameraAnswer";
import { recognizeAnswerImage } from "../api/claudeContent";
vi.mock("../api/claudeContent", () => ({ recognizeAnswerImage: vi.fn() }));

const stop = vi.fn();
const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
const getUserMedia = vi.fn();
function Harness({ initial = "", cameraMode = true }: { initial?: string; cameraMode?: boolean }) {
  const [value, setValue] = useState(initial);
  return <CameraAnswer cameraMode={cameraMode} value={value} onText={setValue}>
    <textarea aria-label="답변" value={value} onChange={(e) => setValue(e.target.value)} />
  </CameraAnswer>;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("isSecureContext", true);
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
  getUserMedia.mockResolvedValue(stream);
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLVideoElement.prototype, "videoWidth", "get").mockReturnValue(1920);
  vi.spyOn(HTMLVideoElement.prototype, "videoHeight", "get").mockReturnValue(1080);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,/9j/4P/Z");
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

async function takePhoto() {
  fireEvent.click(screen.getByRole("button", { name: /답안.*촬영/ }));
  await waitFor(() => expect(screen.getByRole("button", { name: "촬영", exact: true })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "촬영", exact: true }));
}
it("촬영 전 입력칸을 숨기고 전송 확인 후 OCR 결과를 수정할 수 있다", async () => {
  vi.mocked(recognizeAnswerImage).mockResolvedValue("손글씨 answer x² = 4");
  render(<Harness />);
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  await takePhoto();
  expect(stop).toHaveBeenCalled();
  expect(recognizeAnswerImage).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "인식하여 답변에 넣기" }));
  expect(await screen.findByRole("textbox")).toHaveValue("손글씨 answer x² = 4");
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "고친 답변" } });
  expect(screen.getByRole("textbox")).toHaveValue("고친 답변");
});
it("OCR 실패와 취소가 기존 답변을 지우지 않는다", async () => {
  vi.mocked(recognizeAnswerImage).mockRejectedValue(new Error("인식 실패"));
  render(<Harness initial="기존 답변" />);
  await takePhoto();
  fireEvent.click(screen.getByRole("button", { name: "인식하여 답변 바꾸기" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("인식 실패");
  fireEvent.click(screen.getByRole("button", { name: "취소" }));
  expect(screen.getByRole("textbox")).toHaveValue("기존 답변");
});
it("카메라 권한이 늦게 도착해도 닫힌 화면의 스트림을 종료한다", async () => {
  let resolve!: (stream: MediaStream) => void;
  getUserMedia.mockReturnValue(new Promise((r) => { resolve = r; }));
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "답안 촬영" }));
  fireEvent.click(screen.getByRole("button", { name: "취소" }));
  await act(async () => resolve(stream));
  expect(stop).toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
it("인식 중 취소하면 늦은 결과를 답변에 적용하지 않는다", async () => {
  let resolve!: (text: string) => void;
  vi.mocked(recognizeAnswerImage).mockReturnValue(new Promise((r) => { resolve = r; }));
  render(<Harness initial="기존 답변" />);
  await takePhoto();
  fireEvent.click(screen.getByRole("button", { name: "인식하여 답변 바꾸기" }));
  fireEvent.click(screen.getByRole("button", { name: "취소" }));
  expect(vi.mocked(recognizeAnswerImage).mock.calls[0][1].aborted).toBe(true);
  await act(async () => resolve("늦은 결과"));
  expect(screen.getByRole("textbox")).toHaveValue("기존 답변");
});
it("권한 거절 시 직접 입력으로 돌아갈 수 있다", async () => {
  getUserMedia.mockRejectedValue(new DOMException("denied", "NotAllowedError"));
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "답안 촬영" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("카메라 권한");
  fireEvent.click(screen.getByRole("button", { name: "취소" }));
  fireEvent.click(screen.getByRole("button", { name: "직접 입력" }));
  expect(screen.getByRole("textbox")).toBeInTheDocument();
});
it("키보드 모드에서는 기존 입력칸만 보여 준다", () => {
  render(<Harness cameraMode={false} />);
  expect(screen.getByRole("textbox")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "답안 촬영" })).not.toBeInTheDocument();
});
