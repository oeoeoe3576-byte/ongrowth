// 상태 저장소: 처리한 댓글(중복 방지)과 최근 사용한 문구 조합(최근 50건 재사용 금지).
// Upstash Redis(무료 요금제, Vercel Storage에서 연결)의 REST API를 쓴다. 의존성 없음.
// 환경 변수 KV_REST_API_URL / KV_REST_API_TOKEN 이 없으면 메모리 저장소로 동작한다
// (함수 인스턴스가 바뀌면 잊어버리므로 live 모드에서는 Redis 연결을 권장, 서버가 경고를 남긴다).

export interface Store {
  readonly persistent: boolean;
  /** 처음이면 true를 돌려주고 표시한다(원자적). 이미 있으면 false. */
  claim(key: string, ttlSec: number): Promise<boolean>;
  release(key: string): Promise<void>;
  recent(listKey: string): Promise<string[]>;
  pushRecent(listKey: string, value: string, keep: number): Promise<void>;
  incr(key: string, ttlSec: number): Promise<number>;
}

class MemoryStore implements Store {
  readonly persistent = false;
  private keys = new Map<string, number>();
  private lists = new Map<string, string[]>();
  async claim(key: string, ttlSec: number) {
    const now = Date.now();
    const exp = this.keys.get(key);
    if (exp && exp > now) return false;
    this.keys.set(key, now + ttlSec * 1000);
    return true;
  }
  async release(key: string) {
    this.keys.delete(key);
  }
  async recent(listKey: string) {
    return this.lists.get(listKey) ?? [];
  }
  async pushRecent(listKey: string, value: string, keep: number) {
    const l = [value, ...(this.lists.get(listKey) ?? [])].slice(0, keep);
    this.lists.set(listKey, l);
  }
  async incr(key: string, ttlSec: number) {
    const v = (this.keys.get("n:" + key) ?? 0) + 1;
    this.keys.set("n:" + key, v);
    void ttlSec;
    return v;
  }
}

class UpstashStore implements Store {
  readonly persistent = true;
  constructor(private url: string, private token: string) {}
  private async cmd(args: (string | number)[]): Promise<any> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args.map(String)),
    });
    const json = (await res.json()) as { result?: any; error?: string };
    if (!res.ok || json.error) throw new Error(`저장소 오류: ${json.error ?? res.status}`);
    return json.result;
  }
  async claim(key: string, ttlSec: number) {
    return (await this.cmd(["SET", `autodm:${key}`, "1", "NX", "EX", ttlSec])) === "OK";
  }
  async release(key: string) {
    await this.cmd(["DEL", `autodm:${key}`]);
  }
  async recent(listKey: string) {
    return ((await this.cmd(["LRANGE", `autodm:${listKey}`, 0, -1])) as string[]) ?? [];
  }
  async pushRecent(listKey: string, value: string, keep: number) {
    await this.cmd(["LPUSH", `autodm:${listKey}`, value]);
    await this.cmd(["LTRIM", `autodm:${listKey}`, 0, keep - 1]);
  }
  async incr(key: string, ttlSec: number) {
    const v = Number(await this.cmd(["INCR", `autodm:${key}`]));
    if (v === 1) await this.cmd(["EXPIRE", `autodm:${key}`, ttlSec]);
    return v;
  }
}

let cached: Store | null = null;
export function getStore(): Store {
  if (cached) return cached;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  cached = url && token ? new UpstashStore(url, token) : new MemoryStore();
  return cached;
}

/** 테스트용: 메모리 저장소로 강제 */
export function useMemoryStore(): Store {
  cached = new MemoryStore();
  return cached;
}
