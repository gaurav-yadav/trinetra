declare module 'sql.js' {
  interface SqlJsStatic {
    Database: typeof Database;
  }

  interface Database {
    run(sql: string, params?: unknown[]): void;
    exec(sql: string): void;
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
  }

  interface Statement {
    bind(params?: unknown[]): boolean;
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    free(): void;
  }

  export default function initSqlJs(): Promise<SqlJsStatic>;
  export { Database };
}
