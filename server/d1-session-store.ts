import session from "express-session";

export class D1SessionStore extends session.Store {
  constructor(private readonly database: D1Database) {
    super();
  }

  override get(
    sid: string,
    callback: (error: unknown, session?: session.SessionData | null) => void,
  ): void {
    void this.database
      .prepare("SELECT sess, expire FROM session WHERE sid = ?")
      .bind(sid)
      .first<{ sess: string; expire: number }>()
      .then(async (row) => {
        if (!row) {
          callback(null, null);
          return;
        }
        if (row.expire <= Date.now()) {
          await this.database.prepare("DELETE FROM session WHERE sid = ?").bind(sid).run();
          callback(null, null);
          return;
        }
        callback(null, JSON.parse(row.sess) as session.SessionData);
      })
      .catch((error) => callback(error));
  }

  override set(
    sid: string,
    value: session.SessionData,
    callback?: (error?: unknown) => void,
  ): void {
    const expire = value.cookie.expires?.getTime()
      ?? Date.now() + (value.cookie.maxAge ?? 30 * 24 * 60 * 60 * 1000);
    void this.database
      .prepare(
        `INSERT INTO session (sid, sess, expire) VALUES (?, ?, ?)
         ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expire = excluded.expire`,
      )
      .bind(sid, JSON.stringify(value), expire)
      .run()
      .then(() => callback?.())
      .catch((error) => callback?.(error));
  }

  override destroy(sid: string, callback?: (error?: unknown) => void): void {
    void this.database
      .prepare("DELETE FROM session WHERE sid = ?")
      .bind(sid)
      .run()
      .then(() => callback?.())
      .catch((error) => callback?.(error));
  }
}
