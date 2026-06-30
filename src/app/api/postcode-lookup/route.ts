import { error } from "console";
import { NextResponse, type NextRequest } from "next/server";
import { encode } from "punycode";

const POSTCODES_IO_URL = "https://api.postcodes.io";

export async function GET(request: NextRequest) {
    const postcode = request.nextUrl.searchParams.get("postcode");

    if (!postcode) {
        return NextResponse.json(
            { error: "postcode parameter required" },
            { status: 400}
        );
    }

    //Validate England-only postcode (reject Scotland/Wales/NI prefixes)
    const scottishPrefixes = ["AB", "DD", "DG", "EH", "FK", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "G9", "HS", "IV", "KA", "KW", "KY", "ML", "PA", "PH", "TD", "ZE"];
    const niPrefixes = ["BT"];
    const normalised = postcode.replace(/\s/g, "").toUpperCase();
    const prefix = normalised.slice(0, 2);

    if (scottishPrefixes.includes(prefix) || niPrefixes.includes(prefix)) {
        return NextResponse.json(
            { error: "Only England postcoodes are supported" },
            { status: 400}
        );
    }

    try {
        const res = await fetch(
            `${POSTCODES_IO_URL}/postcodes/${encodeURIComponent(normalised)}`
        );

        if (!res.ok) {
            return NextResponse.json(
                { error: "Postcode not found" },
                { status: 404 }
            );
        }

        const data = await res.json();
        const result = data.result;

        //Reject if not in England
        if (result.country !== "England") {
            return NextResponse.json(
                {error: "Only England postcodes are supported" },
                { status: 400 }
            );
        }

        return NextResponse.json({
            postcode: result.postcode,
            admin_district: result.admin_district,
            parish: result.parish,
            region: result.region,
        });
    } catch {
        return NextResponse.json(
            { error: "Failed to lookup postcode" },
            { status: 502 }
        );
    }
}