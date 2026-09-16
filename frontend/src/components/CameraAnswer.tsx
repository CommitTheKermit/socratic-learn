import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { recognizeAnswerImage } from "../api/claudeContent";
import "../styles/camera-answer.css";

const MOBILE_QUERY = "(max-width: 760px), (hover: none) and (pointer: coarse)";

/** 기존 모바일 화면 기준에 터치 기기의 가로 방향을 포함한다. */
export function useCameraAnswerMode() {
  const [mobile, setMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  const [selected, setSelected] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const update = () => setMobile(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return {
    cameraMode: mobile && selected,
    modeSwitch: mobile ? (
      <div className="lv-seg camera-mode-switch" role="group" aria-label="답변 입력 방식">
        <button type="button" className={!selected ? "is-active" : ""} aria-pressed={!selected} onClick={() => setSelected(false)}>키보드</button>
        <button type="button" className={selected ? "is-active" : ""} aria-pressed={selected} onClick={() => setSelected(true)}>카메라 답변</button>
      </div>
    ) : null,
  };
}

export function CameraAnswer({ cameraMode, value, disabled = false, onText, children }: {
  cameraMode: boolean;
  value: string;
  disabled?: boolean;
  onText: (text: string) => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [editable, setEditable] = useState(false);
  useEffect(() => { if (!cameraMode || disabled) setOpen(false); }, [cameraMode, disabled]);
  if (!cameraMode || disabled) return <>{children}</>;
  return (
    <div className="camera-answer">
      <div className="camera-actions">
        <button type="button" className="lv-btn-ghost" onClick={() => setOpen(true)}>{value ? "답안 다시 촬영" : "답안 촬영"}</button>
        {!editable && !value && <button type="button" className="lv-btn-ghost" onClick={() => setEditable(true)}>직접 입력</button>}
      </div>
      {(editable || !!value) && children}
      {open && <CameraCapture
        replacing={!!value}
        onClose={() => setOpen(false)}
        onText={(text) => {
          onText(text);
          setEditable(true);
          setOpen(false);
        }}
      />}
      {(editable || !!value) && <p className="camera-note">인식한 글자와 수식을 확인하고 수정한 뒤 제출해 주세요.</p>}
    </div>
  );
}

function CameraCapture({ replacing, onClose, onText }: {
  replacing: boolean;
  onClose: () => void;
  onText: (text: string) => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestOnText = useRef(onText);
  latestOnText.current = onText;

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    const dialog = dialogRef.current!;
    dialog.showModal();
    const hide = () => { if (document.hidden) onClose(); };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      requestRef.current?.abort();
      stopCamera();
      dialog.close();
    };
    // 모달 생존 기간 동안만 권한과 요청을 유지한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (photo) return;
    let active = true;
    let acquired: MediaStream | null = null;
    setReady(false);
    setError(null);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("카메라를 사용할 수 없어요. HTTPS로 접속하거나 키보드로 답변해 주세요.");
      return;
    }
    void navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    }).then(async (stream) => {
      acquired = stream;
      if (!active) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      if (active) setReady(video.videoWidth > 0);
    }).catch((cause: unknown) => {
      if (!active) return;
      stopCamera();
      const denied = cause instanceof DOMException && cause.name === "NotAllowedError";
      setError(denied ? "카메라 권한이 필요해요. 브라우저 설정에서 허용한 뒤 다시 열어 주세요." : "카메라를 열지 못했어요. 다른 앱에서 카메라를 사용 중인지 확인해 주세요.");
    });
    return () => {
      active = false;
      acquired?.getTracks().forEach((track) => track.stop());
    };
  }, [photo, attempt]);

  const capture = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) return;
    try {
      const scale = Math.min(1, 1920 / Math.max(video.videoWidth, video.videoHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const context = canvas.getContext("2d");
      if (!context) throw new Error();
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/jpeg", 0.9);
      if (!data.startsWith("data:image/jpeg;base64,") || data.length > 2 * 1024 * 1024 * 4 / 3) {
        setError("사진이 너무 커요. 답안 부분을 가까이 잡아 다시 촬영해 주세요.");
        return;
      }
      stopCamera();
      setError(null);
      setPhoto(data);
    } catch {
      setError("사진을 가져오지 못했어요. 다시 촬영해 주세요.");
    }
  };

  const recognize = async () => {
    if (!photo || requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true);
    setError(null);
    const timer = window.setTimeout(() => controller.abort(), 35000);
    try {
      const text = await recognizeAnswerImage(photo.split(",")[1], controller.signal);
      if (!controller.signal.aborted) latestOnText.current(text);
    } catch (cause) {
      if (dialogRef.current?.open) setError(controller.signal.aborted
        ? "인식 시간이 오래 걸려 중단했어요. 다시 시도하거나 키보드로 입력해 주세요."
        : cause instanceof Error ? cause.message : "인식하지 못했어요. 다시 시도해 주세요.");
    } finally {
      window.clearTimeout(timer);
      requestRef.current = null;
      setBusy(false);
    }
  };

  return (
    <dialog ref={dialogRef} className="camera-dialog" aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <h3 id={titleId}>답안 촬영</h3>
      <p className="camera-note">답안만 화면에 담아 주세요. 촬영 효과음은 재생하지 않아요.</p>
      {photo ? <img className="camera-preview" src={photo} alt="촬영한 답안" /> :
        <video ref={videoRef} className="camera-preview" autoPlay muted playsInline aria-label="후면 카메라 미리보기" onLoadedData={() => setReady(true)} />}
      <p className="camera-note">인식 버튼을 누르면 사진을 Google Cloud Vision으로 전송해요. 서비스에는 사진을 저장하지 않아요. 손글씨와 수식은 잘못 읽힐 수 있어요.</p>
      {error && <p role="alert" className="camera-note">{error}</p>}
      {busy && <p role="status" className="camera-note">답안을 읽고 있어요…</p>}
      <div className="camera-actions">
        {photo ? <>
          <button className="lv-btn-holo" type="button" disabled={busy} onClick={() => void recognize()}>{replacing ? "인식하여 답변 바꾸기" : "인식하여 답변에 넣기"}</button>
          <button className="lv-btn-ghost" type="button" disabled={busy} onClick={() => setPhoto(null)}>다시 촬영</button>
        </> : <>
          <button className="lv-btn-holo" type="button" disabled={!ready} onClick={capture}>촬영</button>
          {error && <button className="lv-btn-ghost" type="button" onClick={() => setAttempt((n) => n + 1)}>카메라 다시 열기</button>}
        </>}
        <button className="lv-btn-ghost" type="button" onClick={onClose}>취소</button>
      </div>
    </dialog>
  );
}
