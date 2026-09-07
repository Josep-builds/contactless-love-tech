import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Ensure an operator row exists for every authenticated user.
        // Safe to upsert: RLS restricts this to the caller's own id.
        await supabase.from("operators").upsert(
          {
            id: user.id,
            email: user.email ?? "",
            display_name:
              (user.user_metadata?.full_name as string | undefined) ??
              user.email ??
              "Operator",
          },
          { onConflict: "id" },
        );
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in`);
}
