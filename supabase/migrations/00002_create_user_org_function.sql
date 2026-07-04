-- Function to create organisation and user profile on signup
-- Called from the application after auth.signUp succeeds

CREATE OR REPLACE FUNCTION create_user_org(
    user_id UUID,
    user_email TEXT,
    user_name TEXT,
    org_name TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_org_id UUID;
BEGIN
    INSERT INTO organisations (name)
    VALUES (org_name)
    RETURNING id INTO new_org_id;

    INSERT INTO users (id, org_id, email, full_name, role)
    VALUES (user_id, new_org_id, user_email, user_name, 'owner');

    RETURN new_org_id;
END;
$$;