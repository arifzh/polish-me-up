// One-off: create a manicurist auth user, promote their profile to
// role='manicurist', and ensure a manicurists row exists.
//
// Mirrors createManicuristAccount in app/(manicurist)/profile/actions.ts but
// runs from the CLI using the service-role key (bypasses RLS). Uses plain
// fetch against GoTrue + PostgREST to avoid the supabase-js realtime/ws
// requirement on Node < 22.
//
// Usage:  node scripts/inject-manicurist.mjs
import "dotenv/config";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY;
if (!URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env");
  process.exit(1);
}

const EMAIL = "madam.nadhirah@polishmeup.com.my";
const PASSWORD = "Polish123!";
const FULL_NAME = "Madam Nadhirah";

const baseHeaders = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

async function findUserIdByEmail(email) {
  const res = await fetch(
    `${URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    { headers: baseHeaders },
  );
  if (!res.ok) {
    throw new Error(`listUsers HTTP ${res.status}: ${await res.text()}`);
  }
  const body = await res.json();
  const users = Array.isArray(body?.users) ? body.users : Array.isArray(body) ? body : [];
  const hit = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  return hit?.id ?? null;
}

async function createUser() {
  const res = await fetch(`${URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: FULL_NAME },
    }),
  });
  const text = await res.text();
  if (res.ok) {
    const body = JSON.parse(text);
    return { ok: true, id: body.id ?? body.user?.id };
  }
  return { ok: false, status: res.status, body: text };
}

async function updateUser(userId) {
  const res = await fetch(`${URL}/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    headers: baseHeaders,
    body: JSON.stringify({
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: FULL_NAME },
    }),
  });
  if (!res.ok) {
    throw new Error(`updateUser HTTP ${res.status}: ${await res.text()}`);
  }
}

async function upsertRow(table, row, onConflict) {
  const res = await fetch(
    `${URL}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`,
    {
      method: "POST",
      headers: {
        ...baseHeaders,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(row),
    },
  );
  if (!res.ok) {
    throw new Error(`upsert ${table} HTTP ${res.status}: ${await res.text()}`);
  }
}

async function main() {
  let userId;
  const created = await createUser();
  if (created.ok) {
    userId = created.id;
    console.log(`✓ Created auth user ${userId} for ${EMAIL}.`);
  } else {
    const lower = created.body.toLowerCase();
    const alreadyExists =
      lower.includes("already") ||
      lower.includes("registered") ||
      lower.includes("exists") ||
      created.status === 422;
    if (!alreadyExists) {
      throw new Error(`createUser HTTP ${created.status}: ${created.body}`);
    }
    const existing = await findUserIdByEmail(EMAIL);
    if (!existing) {
      throw new Error(
        `createUser said the user exists but lookup returned nothing. Body: ${created.body}`,
      );
    }
    userId = existing;
    await updateUser(userId);
    console.log(`• Auth user already existed → reused ${userId} and reset password.`);
  }

  await upsertRow(
    "profiles",
    { id: userId, email: EMAIL, full_name: FULL_NAME, role: "manicurist" },
    "id",
  );
  console.log("✓ Profile promoted to role=manicurist.");

  await upsertRow(
    "manicurists",
    { profile_id: userId, is_active: true, rating: 5.0, total_jobs: 0 },
    "profile_id",
  );
  console.log("✓ Manicurists row ensured (active=true).");

  console.log(`\nDone. Sign in with ${EMAIL} / ${PASSWORD}`);
}

main().catch((err) => {
  console.error(`✗ ${err.message}`);
  process.exit(1);
});
