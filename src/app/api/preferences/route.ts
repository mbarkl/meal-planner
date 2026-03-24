import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

const USER_ID = '00000000-0000-0000-0000-000000000001';

export async function GET() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('id', USER_ID)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const body = await request.json();

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('user_preferences')
    .update(body)
    .eq('id', USER_ID)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
