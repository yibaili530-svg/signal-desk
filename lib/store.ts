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
