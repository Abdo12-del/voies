import type { Page, WebSocketRoute } from "@playwright/test";
export const STUDENT_ID = "20000000-0000-4000-8000-000000000001";
export const TEACHER_ID = "10000000-0000-4000-8000-000000000001";
const SECOND_STUDENT = "20000000-0000-4000-8000-000000000002";
export const HOST = "https://journey-fixture.supabase.co";
type Role = "student" | "teacher" | "guest";

/** A protocol-level Supabase fixture, NOT a production/test progress setter in the app.
 * SQL/RLS security is independently tested against actual PostgreSQL in database.test.ts.
 */
export async function mockSupabase(
  page: Page,
  count: number,
  role: Role = "student",
) {
  let completed = count;
  let actor: Role = role;
  const calls: { path: string; method: string; body: unknown }[] = [];
  const students = [{ id: STUDENT_ID, name: "ليان", teacher_id: TEACHER_ID }];
  const connections: Array<{
    ws: WebSocketRoute;
    topic: string;
    array: boolean;
    joinRef: string;
  }> = [];
  const user = (r = actor) => ({
    id: r === "teacher" ? TEACHER_ID : STUDENT_ID,
    aud: "authenticated",
    role: "authenticated",
    email:
      r === "teacher"
        ? "teacher@example.com"
        : "student@students.voies.invalid",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { name: r === "teacher" ? "أستاذة مريم" : "ليان" },
    created_at: "2026-11-11T00:00:00Z",
  });
  const token = (r = actor) =>
    [
      Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
        "base64url",
      ),
      Buffer.from(
        JSON.stringify({
          sub: user(r).id,
          exp: Math.floor(Date.now() / 1000) + 86400,
          aud: "authenticated",
          role: "authenticated",
          iss: `${HOST}/auth/v1`,
        }),
      ).toString("base64url"),
      Buffer.from("fixture-signature").toString("base64url"),
    ].join(".");
  const session = (r = actor) => ({
    access_token: token(r),
    refresh_token: `fixture-${r}-refresh`,
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    token_type: "bearer",
    user: user(r),
  });
  const row = (id = STUDENT_ID) => ({
    student_id: id,
    completed_count: id === STUDENT_ID ? completed : 0,
    updated_at: "2026-11-11T12:00:00Z",
    approved_by: completed ? TEACHER_ID : null,
  });
  if (role !== "guest")
    await page.addInitScript((data) => {
      sessionStorage.setItem("voies.auth", JSON.stringify(data));
    }, session());
  await page.route(`${HOST}/**`, async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      method = request.method();
    const headers = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "content-type": "application/json",
    };
    const reply = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        headers,
        body: status === 204 ? undefined : JSON.stringify(body),
      });
    if (method === "OPTIONS") {
      await reply(null, 204);
      return;
    }
    let body: unknown = null;
    try {
      body = request.postDataJSON();
    } catch {
      /* GET */
    }
    calls.push({ path: url.pathname, method, body });
    if (url.pathname.endsWith("/auth/v1/token")) {
      if ((body as { password?: string })?.password !== "fixture-password") {
        await reply({ message: "Invalid login credentials" }, 400);
        return;
      }
      actor = "teacher";
      await reply(session("teacher"));
      return;
    }
    if (url.pathname.endsWith("/auth/v1/user")) {
      await reply(user());
      return;
    }
    if (url.pathname.endsWith("/auth/v1/logout")) {
      actor = "guest";
      await reply(null, 204);
      return;
    }
    if (url.pathname.endsWith("/functions/v1/journey-auth")) {
      const action = body as { action: string; code?: string; name?: string };
      if (action.action === "login" && action.code === "ABCD2EFGH3") {
        actor = "student";
        await reply(session("student"));
        return;
      }
      if (action.action === "create-student" && actor === "teacher") {
        students.push({
          id: SECOND_STUDENT,
          name: action.name!,
          teacher_id: TEACHER_ID,
        });
        await reply({ student_id: SECOND_STUDENT, login_code: "JKMN2-PQRS3" });
        return;
      }
      await reply({ error: "Invalid request" }, 403);
      return;
    }
    if (url.pathname.endsWith("/rest/v1/profiles")) {
      await reply({
        id: user().id,
        name: actor === "teacher" ? "أستاذة مريم" : "ليان",
        role: actor,
      });
      return;
    }
    if (url.pathname.endsWith("/rest/v1/students")) {
      await reply(
        url.searchParams.has("id")
          ? students.find((s) => url.searchParams.get("id") === `eq.${s.id}`)
          : students,
      );
      return;
    }
    if (url.pathname.endsWith("/rest/v1/progress")) {
      await reply(
        url.searchParams.has("student_id") &&
          !url.searchParams.get("student_id")?.startsWith("in.")
          ? row(url.searchParams.get("student_id")?.slice(3))
          : students.map((s) => row(s.id)),
      );
      return;
    }
    if (url.pathname.includes("/rest/v1/rpc/")) {
      const target = (body as { student_id: string })?.student_id;
      if (actor !== "teacher" || !students.some((s) => s.id === target)) {
        await reply({ code: "42501", message: "Teacher access required" }, 403);
        return;
      }
      completed += url.pathname.endsWith("approve_next_session") ? 1 : -1;
      await reply(row(target));
      return;
    }
    await reply({ error: "Unmocked request", path: url.pathname }, 404);
  });
  await page.routeWebSocket(
    "wss://journey-fixture.supabase.co/realtime/v1/**",
    (ws) => {
      ws.onMessage((raw) => {
        const message = JSON.parse(String(raw));
        const array = Array.isArray(message);
        const [joinRef, ref, topic, event] = array
          ? message
          : [message.join_ref, message.ref, message.topic, message.event];
        if (event === "phx_join") {
          connections.push({ ws, topic, array, joinRef });
          const response = {
            status: "ok",
            response: {
              postgres_changes: [
                {
                  id: 1,
                  event: "*",
                  schema: "public",
                  table: "progress",
                  ...(actor === "student"
                    ? { filter: `student_id=eq.${STUDENT_ID}` }
                    : {}),
                },
              ],
            },
          };
          ws.send(
            JSON.stringify(
              array
                ? [joinRef, ref, topic, "phx_reply", response]
                : {
                    topic,
                    event: "phx_reply",
                    payload: response,
                    ref,
                    join_ref: joinRef,
                  },
            ),
          );
        } else if (event === "heartbeat" || event === "phx_leave") {
          const response = { status: "ok", response: {} };
          ws.send(
            JSON.stringify(
              array
                ? [joinRef, ref, topic, "phx_reply", response]
                : {
                    topic,
                    event: "phx_reply",
                    payload: response,
                    ref,
                    join_ref: joinRef,
                  },
            ),
          );
        }
      });
    },
  );
  return {
    calls,
    get completed() {
      return completed;
    },
    async approveAsTeacher() {
      const old = row();
      completed++;
      for (const c of connections) {
        const payload = {
          ids: [1],
          data: {
            schema: "public",
            table: "progress",
            type: "UPDATE",
            commit_timestamp: "2026-11-11T12:00:01Z",
            errors: null,
            columns: [],
            record: row(),
            old_record: old,
          },
        };
        c.ws.send(
          JSON.stringify(
            c.array
              ? [c.joinRef, null, c.topic, "postgres_changes", payload]
              : {
                  topic: c.topic,
                  event: "postgres_changes",
                  payload,
                  ref: null,
                },
          ),
        );
      }
    },
  };
}
