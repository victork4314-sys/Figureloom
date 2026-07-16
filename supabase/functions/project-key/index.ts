import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers:{ ...corsHeaders, 'Content-Type':'application/json' } });
}

function base64(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function adminKey() {
  const direct = Deno.env.get('SUPABASE_SECRET_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (direct) return direct;
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
    return keys.default || Object.values(keys)[0] || '';
  } catch {
    return '';
  }
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers:corsHeaders });
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return json({ error:'Missing authenticated session.' }, 401);
    const token = authorization.slice(7);
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const secretKey = adminKey();
    const masterSecret = Deno.env.get('VAULT_MASTER_SECRET');
    if (!supabaseUrl || !secretKey || !masterSecret) return json({ error:'Cloud vault secrets are not configured.' }, 500);

    const admin = createClient(supabaseUrl, secretKey, { auth:{ persistSession:false, autoRefreshToken:false } });
    const { data:userData, error:userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error:'Invalid or expired session.' }, 401);

    const { projectId } = await request.json();
    if (!projectId) return json({ error:'projectId is required.' }, 400);
    const userId = userData.user.id;

    const { data:project, error:projectError } = await admin.from('projects').select('id,owner_id').eq('id', projectId).maybeSingle();
    if (projectError || !project) return json({ error:'Project not found.' }, 404);
    let allowed = project.owner_id === userId;
    if (!allowed) {
      const { data:member } = await admin.from('project_members').select('role').eq('project_id', projectId).eq('user_id', userId).maybeSingle();
      allowed = Boolean(member);
    }
    if (!allowed) return json({ error:'You do not have access to this project.' }, 403);

    // A deterministic project-specific AES key permits password recovery and OAuth accounts
    // while keeping the stored project payload encrypted. Rotate VAULT_MASTER_SECRET only with migration.
    const hmacKey = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(masterSecret), { name:'HMAC', hash:'SHA-256' }, false, ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', hmacKey, new TextEncoder().encode(`scicanvas:v1:${projectId}`));
    return json({ key:base64(new Uint8Array(signature)), version:1 });
  } catch (error) {
    console.error(error);
    return json({ error:error instanceof Error ? error.message : 'Unexpected project-key failure.' }, 500);
  }
});
