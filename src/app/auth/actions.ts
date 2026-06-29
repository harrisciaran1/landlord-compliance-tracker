"use server";

import { revalidatePath } from "next/cache";
import {redirect} from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signup(formData: FormData) {
    const supabase = await createClient();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("full_Name") as string;

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: fullName },
        },
    });

    if (error) {
        return { error: error.message };
    }

    // Create organisation and user profile after signup
    if (data.user) {
        const { error: orgError } = await supabase.rpc("create_user_and_org", 
        {
            user_id: data.user.id,
            user_email: email,
            user_name: fullName,
            org_name: `${fullName}'s Properties`,
        });

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