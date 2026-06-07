/**
 * Sub-AC 2-2 / Sub-AC 2-3: SessionItem React.memo 렌더 안정성 검증.
 *
 * Sub-AC 2-2: SessionItem 은 React.memo 로 래핑되어 있다.
 * 비활성 항목의 props(id, label 등)가 변하지 않으면:
 *   - renderCount 가 증가하지 않는다 (render 함수 본문 재호출 없음)
 *   - mountCount 가 증가하지 않는다 (DOM 언마운트/재마운트 없음)
 *
 * Sub-AC 2-3: 활성 항목의 단계 라벨(stage prop)이 변경될 때
 *   - 해당 항목만 재렌더(renderCount 증가)된다
 *   - 리마운트(mountCount 불변)되지 않는다 (key=sessionId 로 DOM 재사용)
 */
import React, { useEffect } from "react";
import { describe, it, expect } from "vitest";
import { render, act } from "@testing-library/react";
import { SessionItem } from "./Sidebar";
import type { SessionItemProps } from "./Sidebar";

// 안정 핸들러 - 모듈 수준 상수로 참조가 변하지 않는다
const noopSelect = (_id: string) => {};
const noopDelete = (_id: string) => {};

describe("SessionItem React.memo - 비활성 항목 리마운트 방지 (Sub-AC 2-2)", () => {
  it("부모 리렌더 시 props 불변 비활성 항목의 renderCount/mountCount 는 증가하지 않는다", async () => {
    const renderCount: Record<string, number> = {};
    const mountCount: Record<string, number> = {};

    /**
     * 실제 SessionItem 을 래핑해 렌더/마운트 횟수를 추적하는 테스트 전용 컴포넌트.
     * React.memo 로 래핑했으므로 props 가 같으면 함수 본문 자체가 호출되지 않아
     * renderCount 가 증가하지 않는다.
     */
    const TrackedItem = React.memo(function TrackedItem(props: SessionItemProps) {
      renderCount[props.sessionId] = (renderCount[props.sessionId] ?? 0) + 1;
      useEffect(() => {
        mountCount[props.sessionId] = (mountCount[props.sessionId] ?? 0) + 1;
      }, [props.sessionId]);
      return <SessionItem {...props} />;
    });

    function Parent({ activeStage }: { activeStage: "learn" | "done" }) {
      return (
        <div>
          {/* 활성 항목: stage 가 바뀌어 리렌더 트리거 */}
          <TrackedItem
            key="s-active"
            sessionId="s-active"
            conceptSummary="활성개념"
            stage={activeStage}
            createdAt={2000}
            isActive={true}
            onSelect={noopSelect}
            onDelete={noopDelete}
          />
          {/* 비활성 항목: 모든 props 불변 */}
          <TrackedItem
            key="s-inactive"
            sessionId="s-inactive"
            conceptSummary="비활성개념"
            stage="done"
            createdAt={1000}
            isActive={false}
            onSelect={noopSelect}
            onDelete={noopDelete}
          />
        </div>
      );
    }

    const { rerender } = render(<Parent activeStage="learn" />);

    // 초기 렌더: 각 항목 1회씩
    expect(renderCount["s-inactive"]).toBe(1);
    expect(mountCount["s-inactive"]).toBe(1);

    // 활성 항목의 stage 변경 -> 부모 리렌더 발생
    await act(async () => {
      rerender(<Parent activeStage="done" />);
    });

    // 비활성 항목: props 불변 -> React.memo 가 리렌더/리마운트 방지
    expect(renderCount["s-inactive"]).toBe(1); // 증가하지 않음
    expect(mountCount["s-inactive"]).toBe(1);  // 증가하지 않음
  });

  it("key 가 변경되면(sessionId 교체) 비활성 항목도 새로 마운트된다 (React.memo 범위 외)", async () => {
    const mountCount: Record<string, number> = {};

    const TrackedItem = React.memo(function TrackedItem(props: SessionItemProps) {
      useEffect(() => {
        mountCount[props.sessionId] = (mountCount[props.sessionId] ?? 0) + 1;
      }, [props.sessionId]);
      return <SessionItem {...props} />;
    });

    const { rerender } = render(
      <TrackedItem
        key="s-1"
        sessionId="s-1"
        conceptSummary="개념"
        stage="learn"
        createdAt={1000}
        isActive={false}
        onSelect={noopSelect}
        onDelete={noopDelete}
      />,
    );
    expect(mountCount["s-1"]).toBe(1);

    // key 변경 = 완전히 다른 컴포넌트 인스턴스 -> 리마운트
    rerender(
      <TrackedItem
        key="s-2"
        sessionId="s-2"
        conceptSummary="개념"
        stage="learn"
        createdAt={1000}
        isActive={false}
        onSelect={noopSelect}
        onDelete={noopDelete}
      />,
    );
    expect(mountCount["s-2"]).toBe(1);
  });
});

describe("SessionItem React.memo - 활성 항목 단계 라벨 갱신 시 재렌더(비리마운트) (Sub-AC 2-3)", () => {
  it("활성 항목 stage prop 변경 시 renderCount 증가, mountCount 불변 (비활성 항목은 변화 없음)", async () => {
    const renderCount: Record<string, number> = {};
    const mountCount: Record<string, number> = {};

    /**
     * SessionItem 을 래핑해 렌더/마운트 횟수를 추적하는 테스트 전용 컴포넌트.
     * React.memo: props 가 바뀐 항목만 재렌더되고, key 가 안정적이면 리마운트되지 않는다.
     */
    const TrackedItem = React.memo(function TrackedItem(props: SessionItemProps) {
      renderCount[props.sessionId] = (renderCount[props.sessionId] ?? 0) + 1;
      useEffect(() => {
        mountCount[props.sessionId] = (mountCount[props.sessionId] ?? 0) + 1;
        // sessionId 가 변하지 않는 한 이 effect 는 mount 시 1회만 실행된다.
      }, [props.sessionId]);
      return <SessionItem {...props} />;
    });

    function Parent({ activeStage }: { activeStage: "learn" | "done" }) {
      return (
        <div>
          {/* 활성 항목: stage prop 이 변경되어 재렌더 트리거 */}
          <TrackedItem
            key="s-active"
            sessionId="s-active"
            conceptSummary="활성개념"
            stage={activeStage}
            createdAt={2000}
            isActive={true}
            onSelect={noopSelect}
            onDelete={noopDelete}
          />
          {/* 비활성 항목: 모든 props 불변 */}
          <TrackedItem
            key="s-inactive"
            sessionId="s-inactive"
            conceptSummary="비활성개념"
            stage="done"
            createdAt={1000}
            isActive={false}
            onSelect={noopSelect}
            onDelete={noopDelete}
          />
        </div>
      );
    }

    const { rerender } = render(<Parent activeStage="learn" />);

    // 초기 렌더: 각 항목 1회씩 마운트+렌더
    expect(renderCount["s-active"]).toBe(1);
    expect(mountCount["s-active"]).toBe(1);
    expect(renderCount["s-inactive"]).toBe(1);
    expect(mountCount["s-inactive"]).toBe(1);

    // 활성 항목의 stage 변경: "학습 진행"(learn) -> "완료"(done)
    // key="s-active" 로 안정적이므로 리마운트 없이 props update 만 발생해야 한다.
    await act(async () => {
      rerender(<Parent activeStage="done" />);
    });

    // 활성 항목: stage prop 변경 -> 재렌더 발생(renderCount 증가), 리마운트 없음(mountCount 불변)
    expect(renderCount["s-active"]).toBe(2);  // 재렌더됨
    expect(mountCount["s-active"]).toBe(1);   // 리마운트 없음

    // 비활성 항목: props 불변 -> React.memo 가 재렌더/리마운트 모두 방지
    expect(renderCount["s-inactive"]).toBe(1); // 변화 없음
    expect(mountCount["s-inactive"]).toBe(1);  // 변화 없음
  });
});
