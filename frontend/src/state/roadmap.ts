import type { Step } from "../stages/data";

export interface RoadmapOutlineItem {
  title: string;
  desc: string;
}

/**
 * 주제 입력에서 받아온 outline 배열을 학습 로드맵 단계(Step) 배열로 변환한다.
 * - 순서를 그대로 보존한다 (재정렬 금지)
 * - 각 단계는 placeholder 상태 (body 빈 문자열, questions 빈 배열)
 * - id 는 1-based 순번
 */
export function buildRoadmapStages(outline: RoadmapOutlineItem[]): Step[] {
  return outline.map((o, i) => ({
    id: i + 1,
    title: o.title,
    desc: o.desc,
    body: "",
    questions: [],
  }));
}
