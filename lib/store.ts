import { neon } from '@neondatabase/serverless';

let client: ReturnType<typeof neon<false, true>> | undefined;
function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Database is not connected. Configure DATABASE_URL.');
  return client ??= neon(url, {fullResults:true});
}
class Statement {
  constructor(readonly sql:string, readonly values:unknown[] = []) {}
  bind(...values:unknown[]) {return new Statement(this.sql,values);}
  query() {return database().query(this.sql,this.values);}
  async all<T>() {const result=await this.query();return {results:result.rows as T[]};}
  async first<T>():Promise<T|null> {return (await this.all<T>()).results[0]??null;}
  async run() {const result=await this.query();return {meta:{changes:result.rowCount??0}};}
}
export function store() {
  return {
    prepare(sql:string) {let i=0;return new Statement(sql.replace(/\?/g,()=>`$${++i}`));},
    async batch(statements:Statement[]) {
      const result=await database().transaction(statements.map(s=>s.query()));
      return result.map(r=>({meta:{changes:r.rowCount??0}}));
    },
  };
}
export function sameOrigin(request:Request) {
  const origin=request.headers.get('origin');
  if(origin && origin !== new URL(request.url).origin) throw new Error('Invalid request origin');
}

// Serialize admission and insert in one transaction so parallel imports cannot
// exceed the post capacity. A rejected batch inserts nothing; duplicates remain valid.
export async function insertCollectedEntries(rows:{id:string;fingerprint:string;payload:string;created_at:string}[]) {
  const db=database();
  const incoming=`WITH incoming AS (SELECT DISTINCT ON (fingerprint) * FROM jsonb_to_recordset($1::jsonb) AS x(id text,fingerprint text,payload text,created_at text)), fresh AS (SELECT i.* FROM incoming i WHERE NOT EXISTS (SELECT 1 FROM entries e WHERE e.fingerprint=i.fingerprint))`;
  const admission=`(NOT EXISTS (SELECT 1 FROM fresh WHERE payload::jsonb->>'kind'='post') OR (SELECT count(*) FROM entries WHERE payload::jsonb->>'kind'='post')+(SELECT count(*) FROM fresh WHERE payload::jsonb->>'kind'='post')<=100)`;
  const values=[JSON.stringify(rows)];
  const results=await db.transaction([
    db.query('LOCK TABLE entries IN SHARE ROW EXCLUSIVE MODE'),
    db.query(`${incoming} SELECT ${admission} AS allowed`,values),
    db.query(`${incoming} INSERT INTO entries(id,fingerprint,payload,created_at) SELECT id,fingerprint,payload,created_at FROM fresh WHERE ${admission} ON CONFLICT(fingerprint) DO NOTHING`,values),
  ]);
  return {allowed:results[1].rows[0]?.allowed===true,added:results[2].rowCount??0};
}
