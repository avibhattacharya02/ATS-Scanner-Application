import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const destination = new URL("/", request.url);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) destination.searchParams.set("authError", "confirmation");
  } else {
    destination.searchParams.set("authError", "confirmation");
  }

  return NextResponse.redirect(destination);
}
