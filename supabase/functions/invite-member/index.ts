import { createClient, type User } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers:{ ...corsHeaders, 'Content-Type':'application/json' } });
}

async function findUserByEmail(admin: ReturnType<typeof createClient>, email: string): Promise<User | null> {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage:1000 });
    if (error) throw error;
    const user = data.users.find(entry => entry.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < 1000) break;
  }
  return null;
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers:corsHeaders });
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return json({ error:'Missing authenticated session.' }, 401);
    const token = authorization.slice(7);
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const siteUrl = Deno.env.get('SITE_URL');
    if (!supabaseUrl || !serviceRole) return json({ error:'Supabase service credentials are not configured.' }, 500);
    const admin = createClient(supabaseUrl, serviceRole, { auth:{ persistSession:false, autoRefreshToken:false } });

    const { data:userData, error:userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error:'Invalid or expired session.' }, 401);
    const inviter = userData.user;
    const body = await request.json();
    const projectId = String(body.projectId || '');
    const email = String(body.email || '').trim().toLowerCase();
    const role = String(body.role || 'editor');
    if (!projectId || !email) return json({ error:'projectId and email are required.' }, 400);
    if (!['editor','reviewer','viewer'].includes(role)) return json({ error:'Invalid collaborator role.' }, 400);

    const { data:project, error:projectError } = await admin.from('projects').select('id,title,owner_id').eq('id', projectId).maybeSingle();
    if (projectError || !project) return json({ error:'Project not found.' }, 404);
    if (project.owner_id !== inviter.id) return json({ error:'Only the project owner can invite collaborators.' }, 403);

    let invitedUser = await findUserByEmail(admin, email);
    let emailSent = false;
    if (!invitedUser) {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo:siteUrl || undefined,
        data:{ invited_to_project:projectId, invited_project_title:project.title, invited_role:role }
      });
      if (error) throw error;
      invitedUser = data.user;
      emailSent = true;
    }
    if (!invitedUser) return json({ error:'The collaborator account could not be created or located.' }, 500);
    if (invitedUser.id === project.owner_id) return json({ error:'The owner already has full access.' }, 400);

    const { error:membershipError } = await admin.from('project_members').upsert({
      project_id:projectId, user_id:invitedUser.id, role, invited_by:inviter.id
    }, { onConflict:'project_id,user_id' });
    if (membershipError) throw membershipError;

    return json({
      ok:true,
      userId:invitedUser.id,
      role,
      emailSent,
      message:emailSent ? `Invitation email sent to ${email}.` : `${email} now has ${role} access.`
    });
  } catch (error) {
    console.error(error);
    return json({ error:error instanceof Error ? error.message : 'Unexpected invite-member failure.' }, 500);
  }
});
