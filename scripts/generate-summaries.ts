import 'dotenv/config';
import glob from 'fast-glob';
import matter from 'gray-matter';
import * as fs from 'node:fs';
import * as path from 'node:path';
import OpenAI from 'openai';

const POSTS_DIR = path.join(process.cwd(), 'content/posts');
const SUMMARY_DIR = path.join(process.cwd(), 'data/summaries');

// ====== 설정 ======

// 0) 강제 재요약 옵션
// FORCE_SUMMARY=1 pnpm summary  -> 요약이 있어도 무조건 재생성
const FORCE = process.env.FORCE_SUMMARY === '1';

// 특정 포스트만 요약 (경로 또는 key)
// 예: pnpm summary -- --only=posts/hello.md
// 예: pnpm summary -- --only=hello-world
const ONLY = (() => {
  if (process.env.SUMMARY_ONLY) {
    return process.env.SUMMARY_ONLY.split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const args = process.argv.slice(2);
  const values: string[] = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--only' || arg === '--post') {
      const next = args[i + 1];
      if (next) {
        values.push(next);
        i += 1;
      }
      continue;
    }
    if (arg.startsWith('--only=')) {
      values.push(arg.slice('--only='.length));
    }
    if (arg.startsWith('--post=')) {
      values.push(arg.slice('--post='.length));
    }
  }

  return values
    .flatMap((value) => value.split(','))
    .map((s) => s.trim())
    .filter(Boolean);
})();

// 1) 제외할 파일 prefix들
const DEFAULT_EXCLUDE_PREFIXES = [
  '_', // 예: _draft.md, _private/...
  'draft-', // 예: draft-hello.md
  'wip-', // 예: wip-k8s.md
];

const EXCLUDE_PREFIXES = process.env.SUMMARY_EXCLUDE_PREFIXES
  ? process.env.SUMMARY_EXCLUDE_PREFIXES.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : DEFAULT_EXCLUDE_PREFIXES;

// 2) 본문 길이 제한 (너무 길면 입력 토큰 과금/실패 위험)
const MAX_INPUT_CHARS = Number(process.env.SUMMARY_MAX_INPUT_CHARS ?? '12000');

// 3) 모델/생성 옵션
const MODEL = process.env.SUMMARY_MODEL ?? 'gpt-4.1-mini';
const TEMPERATURE = Number(process.env.SUMMARY_TEMPERATURE ?? '0.2');

// ★ 끊김 방지를 위해 기본값을 800으로 상향
const MAX_OUTPUT_TOKENS = Number(
  process.env.SUMMARY_MAX_OUTPUT_TOKENS ?? '800',
);

// ====== OpenAI 클라이언트 ======
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ====== 유틸 ======
const toKeyFromRelPath = (relPath: string) => {
  let p = relPath.replace(/\\/g, '/');
  p = p.replace(/\/index\.md$/, ''); // leaf bundle
  p = p.replace(/\.md$/, '');
  return p.replace(/\//g, '-');
};

const clampText = (text: string, maxChars = MAX_INPUT_CHARS) => {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length > maxChars
    ? normalized.slice(0, maxChars) + '\n\n(이하 생략)'
    : normalized;
};

// prefix 기반 제외 로직
const shouldSkipFile = (relPath: string) => {
  const p = relPath.replace(/\\/g, '/');
  const segments = p.split('/');
  const baseName = segments[segments.length - 1];

  if (baseName === '_index.md') return true;

  return segments.some((seg) =>
    EXCLUDE_PREFIXES.some((prefix) => seg.startsWith(prefix)),
  );
};

const normalizeTarget = (target: string) => {
  const trimmed = target.trim().replace(/\\/g, '/');
  return trimmed.replace(/^\.\//, '');
};

const matchesOnlyTarget = (file: string, key: string) => {
  if (ONLY.length === 0) return true;

  const normalizedFile = normalizeTarget(file);
  const candidates = new Set([normalizedFile, `posts/${normalizedFile}`, key]);

  for (const rawTarget of ONLY) {
    const target = normalizeTarget(rawTarget);
    if (candidates.has(target)) return true;
  }

  return false;
};

const aiSummarize = async (text: string, title: string) => {
  const input = clampText(text);

  const prompt = `
너는 기술 블로그 글을 요약하는 도우미야.
아래 글을 읽고 한국어로 간결하지만 핵심을 놓치지 않게 요약해줘.

요약 규칙:
- 반드시 Markdown 불릿 리스트로 출력
- 각 불릿은 반드시 새 줄에서 "- " 로 시작
- 불릿 사이에 문장을 이어붙이지 말 것 (한 줄에 하나의 불릿만)
- 5~6개의 불릿으로 제한
- 각 불릿은 한 문장
- 마지막 불릿도 문장이 끊기지 않게 완성해서 끝맺을 것
- 코드/명령어는 필요하면 짧게 언급
- 과장 금지, 원문에 있는 내용만

제목: ${title}

본문:
${input}
`.trim();

  const resp = await openai.responses.create({
    model: MODEL,
    input: prompt,
    temperature: TEMPERATURE,
    max_output_tokens: MAX_OUTPUT_TOKENS,
  });

  const summary = resp.output_text?.trim();
  if (!summary) throw new Error('Empty summary from OpenAI');

  return summary;
};

const main = async () => {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY is not set. Put it in .env');
    process.exit(1);
  }

  if (!fs.existsSync(SUMMARY_DIR)) {
    fs.mkdirSync(SUMMARY_DIR, { recursive: true });
  }

  const files = await glob('**/*.md', { cwd: POSTS_DIR });

  for (const file of files) {
    if (shouldSkipFile(file)) {
      console.log(`⏭️ skipped by prefix: ${file}`);
      continue;
    }

    const fullPath = path.join(POSTS_DIR, file);
    const raw = fs.readFileSync(fullPath, 'utf-8');
    const { data, content } = matter(raw);

    // front matter로도 개별 제외 가능
    if (data.summary === false || data.skipSummary === true) {
      console.log(`⏭️ skipped by front matter: ${file}`);
      continue;
    }

    const key = toKeyFromRelPath(file);
    const title = data.title ?? key;

    if (!matchesOnlyTarget(file, key)) {
      console.log(`⏭️ skipped by only: ${file}`);
      continue;
    }

    const outPath = path.join(SUMMARY_DIR, `${key}.json`);

    // ✅ 요약 파일이 이미 있으면 스킵 (force면 무시)
    if (!FORCE && ONLY.length === 0 && fs.existsSync(outPath)) {
      console.log(`✅ summary exists, skip: ${key}`);
      continue;
    }

    try {
      console.log(`⏳ summarizing: ${key}`);
      const summaryText = await aiSummarize(content, title);

      const summaryJson = {
        title,
        key,
        summary: summaryText,
        updatedAt: new Date().toISOString(),
      };

      fs.writeFileSync(outPath, JSON.stringify(summaryJson, null, 2), 'utf-8');
      console.log(`✅ summary updated: ${outPath}`);
    } catch (e) {
      console.error(`⚠️ failed to summarize ${key}:`, e);
    }
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
