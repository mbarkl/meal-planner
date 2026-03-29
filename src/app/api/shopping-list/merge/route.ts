import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { keepId, deleteIds, mergedName, mergedQty, mergedUnit } = body as {
      keepId: string;
      deleteIds: string[];
      mergedName: string;
      mergedQty: number | null;
      mergedUnit: string | null;
    };

    if (!keepId || !deleteIds?.length || !mergedName) {
      return NextResponse.json(
        { error: 'Missing required fields: keepId, deleteIds, mergedName' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Update the kept item with the merged name + quantity
    const { error: updateError } = await supabase
      .from('shopping_list_items')
      .update({
        ingredient_name: mergedName,
        quantity: mergedQty,
        unit: mergedUnit,
      })
      .eq('id', keepId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Delete the other items
    const { error: deleteError } = await supabase
      .from('shopping_list_items')
      .delete()
      .in('id', deleteIds);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
