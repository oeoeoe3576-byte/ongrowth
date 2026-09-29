// RFC 4180 CSV 읽기/쓰기 (외부 의존성 없음).
// - 인코딩: UTF-8. 기본은 BOM 없음 (Canva/Google Sheets용).
//   Excel(Windows)에서 직접 열 파일만 bom: true 로 생성한다.
// - 줄바꿈: CRLF (RFC 4180)
// - 쉼표, 큰따옴표, 줄바꿈이 들어간 값은 큰따옴표로 감싸고 내부 " 는 "" 로 이스케이프

const BOM = "﻿";

function escapeCell(value: string): string {
  if (/[",\r\n]/.test(value) || value !== value.trim()) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(header: readonly string[], rows: Record<string, string>[], opts: { bom?: boolean } = {}): string {
  const lines = [header.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(header.map((h) => escapeCell(row[h] ?? "")).join(","));
  }
  return (opts.bom ? BOM : "") + lines.join("\r\n") + "\r\n";
}

export interface ParsedCsv {
  header: string[];
  rows: Record<string, string>[];
  hadBom: boolean;
}

export function parseCsv(text: string): ParsedCsv {
  const hadBom = text.startsWith(BOM);
  if (hadBom) text = text.slice(1);

  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      if (field.length > 0) throw new Error(`CSV 형식 오류: 따옴표가 필드 중간에 있음 (문자 위치 ${i})`);
      inQuotes = true;
      i++;
    } else if (ch === ",") {
      record.push(field);
      field = "";
      i++;
    } else if (ch === "\r" || ch === "\n") {
      record.push(field);
      records.push(record);
      field = "";
      record = [];
      i += ch === "\r" && text[i + 1] === "\n" ? 2 : 1;
    } else {
      field += ch;
      i++;
    }
  }
  if (inQuotes) throw new Error("CSV 형식 오류: 닫히지 않은 따옴표");
  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  const [header = [], ...body] = records;
  const rows = body.map((cells, idx) => {
    if (cells.length !== header.length) {
      throw new Error(`CSV 형식 오류: ${idx + 2}행의 셀 수(${cells.length})가 헤더 수(${header.length})와 다름`);
    }
    return Object.fromEntries(header.map((h, j) => [h, cells[j]]));
  });
  return { header, rows, hadBom };
}
