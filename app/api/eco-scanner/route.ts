import { NextResponse } from 'next/server';

interface EcoScannerRequest {
  code: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as EcoScannerRequest;
    const { code } = body;

    // ✅ Inline map to avoid name collisions
    const ecoDatabase: Record<string, string> = {
      PLASTIC001: 'Plastic Bottle - recyclable',
      CAN002: 'Aluminum Can - recyclable',
      PAPER003: 'Paper - compostable',
    };

    const message = ecoDatabase[code]
      ? '✅ ${ecoDatabase[code]}'
      : '⚠️ Item not recognized in the eco-database.';

    return NextResponse.json({ message }, { status: 200 });
  } catch (error) {
    console.error('Eco-scanner API error:', error);
    return NextResponse.json(
      { message: 'Server error while scanning item.' },
      { status: 500 }
    );
  }
}