import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('purchases')
    .select('*')
    .order('purchase_date', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { store, purchase_date, total_amount, shopping_list_id, notes } = body as {
      store: string;
      purchase_date: string;
      total_amount: number | null;
      shopping_list_id?: string | null;
      notes?: string | null;
    };

    if (!store || !purchase_date) {
      return NextResponse.json(
        { error: 'Missing required fields: store, purchase_date' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        store,
        purchase_date,
        total_amount,
        shopping_list_id: shopping_list_id || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (purchaseError) {
      return NextResponse.json(
        { error: `Failed to create purchase: ${purchaseError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(purchase, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Failed to create purchase: ${message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing purchase id' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { error } = await supabase.from('purchases').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
