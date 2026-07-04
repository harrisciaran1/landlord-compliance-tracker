"use server";

import { revalidatePath } from "next/cache";
import {redirect} from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signup(formData: FormData) {
    const supabase = await createClient();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("full_name") as string;

    const { data: rpcData, error: orgError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: fullName },
        },
    });

    if (orgError) {
        return { error: orgError.message };
    }

    // Create organisation and user profile after signup
    if (rpcData.user) {
        const { error: orgError } = await supabase.rpc("create_user_org", 
        {
            user_id: rpcData.user.id,
            user_email: email,
            user_name: fullName,
            org_name: `${fullName}'s Properties`,
        });

        console.log("RPC data:", rpcData);
        console.log("RPC error:", orgError);

        if (orgError) {
            return { error: orgError.message };
        }
    }

    revalidatePath("/", "layout");
    redirect("/dashboard");
}

export async function login(formData: FormData) {
    const supabase = await createClient();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    
    if (error) {
        return { error: error.message };
    }

    revalidatePath("/", "layout");
    redirect("/dashboard");
}

export async function logout() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    revalidatePath("/", "layout");
    redirect("/login");
}

export async function resetPassword(formData: FormData) {
    const supabase = await createClient();

    const email = formData.get("email") as string;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/update-password`,
    });

    if (error) {
        return { error: error.message };
    }

    return { success: "Check your email for a password reset link." };
}

export async function updatePassword(formData: FormData) {
    const supabase = await createClient();

    const password = formData.get("password") as string;
    
    const { error } = await supabase.auth.updateUser({password});

    if (error) {
        return { error: error.message };
    }
    
    revalidatePath("/", "layout");
    redirect("/dashboard");
}