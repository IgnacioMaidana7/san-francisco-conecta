import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { uid } from "../src/seed";
// Motor PostgreSQL real en WASM. Auth/Storage son contratos mínimos para validar SQL y RLS.
const db = new PGlite();
const alice = uid(101);
const bob = uid(102);
async function asUser<T>(id: string, query: string, params: unknown[] = []) {
  return db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [id]);
    return tx.query<T>(query, params);
  });
}
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key); grant usage on schema auth to authenticated,anon;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security; grant usage on schema storage to authenticated; grant select,insert,delete on storage.objects to authenticated;
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;`);
  for (const file of [
    "202611210001_initial.sql",
    "202611210002_demo_catalog.sql",
    "202611210003_push_subscription_upsert.sql",
  ])
    await db.exec(
      await readFile(
        new URL(`../supabase/migrations/${file}`, import.meta.url),
        "utf8",
      ),
    );
  await db.query("insert into auth.users(id) values($1),($2)", [alice, bob]);
}, 60000);
afterAll(async () => {
  await db.close();
});
describe("Migraciones, aislamiento y operaciones atómicas", () => {
  it("prepara dos cuentas y aplica RLS sobre cedulones", async () => {
    const result = await asUser<{ user_id: string }>(
      alice,
      "select user_id from public.bills",
    );
    expect(result.rows).toHaveLength(2);
    expect(result.rows.every((r) => r.user_id === alice)).toBe(true);
    const denied = await asUser(
      bob,
      "select * from public.bills where user_id=$1",
      [alice],
    );
    expect(denied.rows).toHaveLength(0);
  });
  it("rechaza escritura directa en pagos y cambios de deuda", async () => {
    await expect(
      asUser(alice, "update public.bills set amount=1"),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asUser(
        alice,
        "insert into public.payments(user_id,amount,description) values($1,1,'fraude')",
        [alice],
      ),
    ).rejects.toThrow(/permission denied/);
  });
  it("paga una sola vez y no permite pagar obligaciones ajenas", async () => {
    const bill = (
      await asUser<{ id: string }>(alice, "select id from bills limit 1")
    ).rows[0].id;
    await expect(
      asUser(bob, "select public.pay_bill_demo($1)", [bill]),
    ).rejects.toThrow();
    await asUser(alice, "select public.pay_bill_demo($1)", [bill]);
    await expect(
      asUser(alice, "select public.pay_bill_demo($1)", [bill]),
    ).rejects.toThrow();
    expect(
      (await asUser(alice, "select * from payments where bill_id=$1", [bill]))
        .rows,
    ).toHaveLength(1);
  });
  it("valida estacionamiento, evita sesiones duplicadas y extiende con tarifa del servidor", async () => {
    await expect(
      asUser(alice, "select start_parking_demo($1,$2,$3)", [
        uid(21),
        "AB123CD",
        0,
      ]),
    ).rejects.toThrow();
    await asUser(alice, "select start_parking_demo($1,$2,$3)", [
      uid(21),
      "AB123CD",
      60,
    ]);
    await expect(
      asUser(alice, "select start_parking_demo($1,$2,$3)", [
        uid(21),
        "AB123CD",
        30,
      ]),
    ).rejects.toThrow();
    const p = (
      await asUser<{ id: string }>(
        alice,
        "select id from parking where status='active'",
      )
    ).rows[0];
    await expect(
      asUser(bob, "select extend_parking_demo($1,30)", [p.id]),
    ).rejects.toThrow();
    await asUser(alice, "select extend_parking_demo($1,30)", [p.id]);
    const result = await asUser<{ amount: string }>(
      alice,
      "select amount from parking where id=$1",
      [p.id],
    );
    expect(Number(result.rows[0].amount)).toBe(900);
  });
  it("crea reclamos con seguimiento y bloquea adjuntos de otros usuarios", async () => {
    await asUser(
      alice,
      "insert into claims(user_id,category,description,address) values($1,'Alumbrado','Luminaria apagada en la plaza','Libertad 1200')",
      [alice],
    );
    const claim = (
      await asUser<{ status: string; events: unknown[] }>(
        alice,
        "select status,events from claims",
      )
    ).rows[0];
    expect(claim.status).toBe("recibido");
    expect(claim.events).toHaveLength(1);
    await expect(
      asUser(
        alice,
        "insert into claims(user_id,category,description,address,attachments) values($1,'Otros','Problema con la plaza','Libertad 1200',$2)",
        [
          alice,
          JSON.stringify([
            {
              path: `${bob}/otro.pdf`,
              name: "otro.pdf",
              type: "application/pdf",
              size: 100,
            },
          ]),
        ],
      ),
    ).rejects.toThrow();
    expect((await asUser(bob, "select * from claims")).rows).toHaveLength(0);
  });
  it("mantiene archivos privados y no permite escribir en otra carpeta", async () => {
    await asUser(
      alice,
      "insert into storage.objects(bucket_id,name) values('claim-attachments',$1)",
      [`${alice}/foto.png`],
    );
    expect(
      (await asUser(bob, "select * from storage.objects")).rows,
    ).toHaveLength(0);
    await expect(
      asUser(
        bob,
        "insert into storage.objects(bucket_id,name) values('claim-attachments',$1)",
        [`${alice}/intruso.png`],
      ),
    ).rejects.toThrow();
  });
  it("genera alarmas solo para zonas suscriptas y elimina duplicados de recordatorios", async () => {
    await asUser(
      bob,
      "update preferences set settings=jsonb_set(settings,'{zones}','[]')",
    );
    await db.query("update alarms set active=true where id=$1", [uid(11)]);
    expect(
      (
        await asUser(
          alice,
          "select * from notifications where category='alarmas'",
        )
      ).rows,
    ).toHaveLength(1);
    expect(
      (
        await asUser(
          bob,
          "select * from notifications where category='alarmas'",
        )
      ).rows,
    ).toHaveLength(0);
    await asUser(alice, "select check_reminders()");
    await asUser(alice, "select check_reminders()");
    expect(
      (
        await asUser(
          alice,
          "select * from notifications where dedupe_key like 'bill:%'",
        )
      ).rows,
    ).toHaveLength(1);
  });
  it("permite renovar una suscripción propia sin cambiar la de otra cuenta", async () => {
    const endpoint = "https://fcm.googleapis.com/fcm/send/prueba";
    const upsert = `
      insert into push_subscriptions(user_id, endpoint, subscription)
      values ($1, $2, $3)
      on conflict (endpoint) do update set
        user_id = excluded.user_id,
        endpoint = excluded.endpoint,
        subscription = excluded.subscription
      returning id, subscription
    `;
    const initial = JSON.stringify({ endpoint, keys: { auth: "initial" } });
    const renewed = JSON.stringify({ endpoint, keys: { auth: "renewed" } });
    const first = await asUser<{ id: string }>(alice, upsert, [
      alice,
      endpoint,
      initial,
    ]);
    const second = await asUser<{ id: string }>(alice, upsert, [
      alice,
      endpoint,
      renewed,
    ]);
    expect(second.rows[0].id).toBe(first.rows[0].id);
    await expect(
      asUser(bob, upsert, [bob, endpoint, initial]),
    ).rejects.toThrow();
    expect(
      (await asUser(bob, "select id from push_subscriptions")).rows,
    ).toHaveLength(0);
  });
  it("no expone funciones internas ni el disparador global a vecinos", async () => {
    await expect(asUser(alice, "select run_reminders()")).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      asUser(alice, "select enqueue_notice($1,'x','x','obras','/')", [bob]),
    ).rejects.toThrow(/permission denied/);
  });
});
