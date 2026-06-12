// LLM 구조화 출력 어댑터. 기본은 Anthropic messages.parse 이고,
// emulator + LLM_PROVIDER=codex 일 때만 로컬 codex CLI(ChatGPT 구독 인증)로 우회한다.
// 실배포 런타임에는 FUNCTIONS_EMULATOR 가 없으므로 codex 경로가 절대 활성화되지 않는다.
import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as logger from "firebase-functions/logger";

export interface StructuredRequest {
  apiKey: string;
  model: string;
  maxTokens: number;
  system: string;
  user: string;
  schema: unknown;
}

export function isCodexEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.FUNCTIONS_EMULATOR === "true" && env.LLM_PROVIDER === "codex";
}

export async function parseStructured(req: StructuredRequest): Promise<unknown> {
  if (isCodexEnabled()) {
    logger.info("parseStructured: codex 경로 사용 (로컬 실험 모드)");
    return codexParse(req);
  }
  return anthropicParse(req);
}

async function anthropicParse(req: StructuredRequest): Promise<unknown> {
  const client = new Anthropic({ apiKey: req.apiKey });
  const resp = await client.messages.parse({
    model: req.model,
    max_tokens: req.maxTokens,
    system: [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: req.user }],
    output_config: {
      format: jsonSchemaOutputFormat(req.schema as Parameters<typeof jsonSchemaOutputFormat>[0]),
    },
  });
  return resp.parsed_output;
}

// codex exec 는 에이전트 부팅 오버헤드가 있어 reasoning none + 도구 비활성으로 최소화한다.
// stdin 은 반드시 닫아야 한다(파이프가 열려 있으면 무한 대기).
const CODEX_TIMEOUT_MS = 180_000;

async function codexParse(req: StructuredRequest): Promise<unknown> {
  const dir = await mkdtemp(join(tmpdir(), "codex-llm-"));
  try {
    const schemaPath = join(dir, "schema.json");
    const outPath = join(dir, "out.json");
    await writeFile(schemaPath, JSON.stringify(req.schema));

    const bin = process.env.CODEX_BIN ?? "codex";
    const args = [
      "exec",
      "--cd", dir,
      "--skip-git-repo-check",
      "-s", "read-only",
      "-c", `model_reasoning_effort=${process.env.CODEX_REASONING ?? "none"}`,
      "--disable", "image_generation",
      "-c", 'web_search="disabled"',
      "--output-schema", schemaPath,
      "--output-last-message", outPath,
    ];
    if (process.env.CODEX_MODEL) args.push("-m", process.env.CODEX_MODEL);
    args.push("-"); // 프롬프트는 stdin 으로 받는다

    await runCodex(bin, args, `${req.system}\n\n---\n\n${req.user}`);

    const raw = await readFile(outPath, "utf8");
    return JSON.parse(raw);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function runCodex(bin: string, args: string[], prompt: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["pipe", "ignore", "pipe"] });
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`codex exec timeout (${CODEX_TIMEOUT_MS}ms)`));
    }, CODEX_TIMEOUT_MS);

    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(new Error(`codex 실행 실패(${bin}): ${e.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`codex exec 종료 코드 ${code}: ${stderr.slice(-500)}`));
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}
