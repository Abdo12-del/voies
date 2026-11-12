import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

// Real PostgreSQL WASM, not mocked policy predicates. Migrations are executed verbatim.
const teacher = "10000000-0000-4000-8000-000000000001";
const teacher2 = "10000000-0000-4000-8000-000000000002";
const student = "20000000-0000-4000-8000-000000000001";
const student2 = "20000000-0000-4000-8000-000000000002";
const other = "20000000-0000-4000-8000-000000000003";
let db: PGlite;
async function asRole<T>(
  role: "authenticated" | "anon" | "service_role",
  id: string | null,
  sql: string,
) {
  await db.exec(
    `set role ${role}; select set_config('request.jwt.claim.sub', '${id ?? ""}', false);`,
  );
  try {
    return (await db.query<T>(sql)).rows;
  } finally {
    await db.exec("reset role");
  }
}
const progressFor = async (id: string) =>
  (
    await db.query<{ completed_count: number; approved_by: string }>(
      `select * from public.progress where student_id = '${id}'`,
    )
  ).rows[0];

describe("Supabase schema, RLS and one-step approvals", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to anon, authenticated, service_role;
      grant execute on function auth.uid() to anon, authenticated, service_role;
    `);
    await db.exec(
      readFileSync(
        new URL(
          "../supabase/migrations/20261111193819_journey_roles_progress_and_approvals.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    for (const [id, name] of [
      [teacher, "المدرّب"],
      [teacher2, "مدرّب آخر"],
      [student, "ليان"],
      [student2, "ياسين"],
      [other, "تلميذ آخر"],
    ]) {
      await db.query(
        "insert into auth.users(id, raw_user_meta_data) values ($1, $2)",
        [id, { name, role: "teacher" }],
      );
    }
    await db.exec(
      `update public.profiles set role='teacher' where id in ('${teacher}', '${teacher2}');`,
    );
    await db.query("select public.register_student($1,$2,$3,$4)", [
      student,
      "ليان",
      teacher,
      "a".repeat(64),
    ]);
    await db.query("select public.register_student($1,$2,$3,$4)", [
      student2,
      "ياسين",
      teacher,
      "b".repeat(64),
    ]);
    await db.query("select public.register_student($1,$2,$3,$4)", [
      other,
      "تلميذ آخر",
      teacher2,
      "c".repeat(64),
    ]);
  });
  beforeEach(async () => {
    await db.exec(
      "update public.progress set completed_count=0, approved_by=null; delete from private.login_attempts;",
    );
  });
  afterAll(async () => {
    await db?.close();
  });

  it("starts at zero and ignores a forged teacher role in Auth user metadata", async () => {
    const rows = await asRole<{ role: string }>(
      "authenticated",
      student,
      "select role from public.profiles",
    );
    expect(rows).toEqual([{ role: "student" }]);
    expect((await progressFor(student)).completed_count).toBe(0);
  });
  it("a child sees only their own profile, student row and progress", async () => {
    expect(
      await asRole(
        "authenticated",
        student,
        "select student_id, completed_count from public.progress",
      ),
    ).toEqual([{ student_id: student, completed_count: 0 }]);
    expect(
      await asRole(
        "authenticated",
        student,
        "select id, name, teacher_id from public.students",
      ),
    ).toEqual([{ id: student, name: "ليان", teacher_id: teacher }]);
    expect(
      await asRole(
        "authenticated",
        student,
        `select * from public.progress where student_id='${other}'`,
      ),
    ).toEqual([]);
  });
  it("the login credential hash is not readable by children OR teachers", async () => {
    await expect(
      asRole(
        "authenticated",
        student,
        "select login_code from public.students",
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      asRole(
        "authenticated",
        teacher,
        "select login_code from public.students",
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("a child cannot PATCH progress, spoof their profile role or change their teacher", async () => {
    await expect(
      asRole(
        "authenticated",
        student,
        `update public.progress set completed_count=32 where student_id='${student}'`,
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      asRole(
        "authenticated",
        student,
        "update public.profiles set role='teacher'",
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      asRole(
        "authenticated",
        student,
        `update public.students set teacher_id='${student}'`,
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("a child cannot call approve OR undo OR provision students", async () => {
    await expect(
      asRole(
        "authenticated",
        student,
        `select public.approve_next_session('${student}')`,
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      asRole(
        "authenticated",
        student,
        `select public.undo_last_session('${student}')`,
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      asRole(
        "authenticated",
        student,
        `select public.register_student('${other}','اسم','${student}','${"d".repeat(64)}')`,
      ),
    ).rejects.toMatchObject({ code: "42501" });
    expect((await progressFor(student)).completed_count).toBe(0);
  });
  it("a teacher sees only the students they own", async () => {
    const rows = await asRole<{ student_id: string }>(
      "authenticated",
      teacher,
      "select student_id from public.progress order by student_id",
    );
    expect(rows.map((r) => r.student_id)).toEqual([student, student2]);
    expect(
      await asRole(
        "authenticated",
        teacher2,
        "select student_id from public.progress",
      ),
    ).toEqual([{ student_id: other }]);
  });
  it("even a teacher cannot directly update a count or jump to session 32", async () => {
    await expect(
      asRole(
        "authenticated",
        teacher,
        `update public.progress set completed_count=32 where student_id='${student}'`,
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      asRole(
        "authenticated",
        teacher,
        `insert into public.progress(student_id,completed_count) values('${student}',32)`,
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("approval increases exactly one step, records the approver, and does not affect other students", async () => {
    await db.exec(
      `update public.progress set completed_count=7 where student_id='${student}'`,
    );
    await asRole(
      "authenticated",
      teacher,
      `select public.approve_next_session('${student}')`,
    );
    expect(await progressFor(student)).toMatchObject({
      completed_count: 8,
      approved_by: teacher,
    });
    expect((await progressFor(student2)).completed_count).toBe(0);
    expect(
      await asRole(
        "authenticated",
        student,
        "select completed_count from public.progress",
      ),
    ).toEqual([{ completed_count: 8 }]);
  });
  it("another teacher cannot approve or undo this student's sessions", async () => {
    await expect(
      asRole(
        "authenticated",
        teacher2,
        `select public.approve_next_session('${student}')`,
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      asRole(
        "authenticated",
        teacher2,
        `select public.undo_last_session('${student}')`,
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("undo decreases exactly one step and never underflows", async () => {
    await expect(
      asRole(
        "authenticated",
        teacher,
        `select public.undo_last_session('${student}')`,
      ),
    ).rejects.toMatchObject({ code: "22023" });
    await asRole(
      "authenticated",
      teacher,
      `select public.approve_next_session('${student}')`,
    );
    await asRole(
      "authenticated",
      teacher,
      `select public.approve_next_session('${student}')`,
    );
    await asRole(
      "authenticated",
      teacher,
      `select public.undo_last_session('${student}')`,
    );
    expect((await progressFor(student)).completed_count).toBe(1);
  });
  it("all 32 approvals are sequential, stop at 32, and undo reopens exactly session 32", async () => {
    for (let i = 1; i <= 32; i++) {
      await asRole(
        "authenticated",
        teacher,
        `select public.approve_next_session('${student}')`,
      );
      expect((await progressFor(student)).completed_count).toBe(i);
    }
    await expect(
      asRole(
        "authenticated",
        teacher,
        `select public.approve_next_session('${student}')`,
      ),
    ).rejects.toMatchObject({ code: "22023" });
    await asRole(
      "authenticated",
      teacher,
      `select public.undo_last_session('${student}')`,
    );
    expect((await progressFor(student)).completed_count).toBe(31);
  });
  it("anonymous users have neither table access nor approval RPC access", async () => {
    await expect(
      asRole("anon", null, "select * from public.progress"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      asRole("anon", null, `select public.approve_next_session('${student}')`),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("database constraints reject counts outside 0–32", async () => {
    await expect(
      db.exec("update public.progress set completed_count=33"),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      db.exec("update public.progress set completed_count=-1"),
    ).rejects.toMatchObject({ code: "23514" });
  });
  it("code login has persistent server-side rate limiting, unavailable to public callers", async () => {
    for (let i = 0; i < 11; i++) {
      const rows = await asRole<{ consume_login_attempt: boolean }>(
        "service_role",
        null,
        `select public.consume_login_attempt('${"f".repeat(64)}',10)`,
      );
      expect(rows[0].consume_login_attempt).toBe(i < 10);
    }
    await expect(
      asRole(
        "authenticated",
        student,
        `select public.consume_login_attempt('${"a".repeat(64)}',10)`,
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });
});
