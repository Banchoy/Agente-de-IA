async function main() {
    const secretKey = "sk_test_7gXy5K0cnM9rVMcOeExHiRyf4F7LnzpcdeAwvtxPml";
    
    const response = await fetch("https://api.clerk.com/v1/users?limit=50", {
        headers: {
            "Authorization": `Bearer ${secretKey}`,
            "Content-Type": "application/json"
        }
    });
    
    if (!response.ok) {
        throw new Error(`Erro na API do Clerk: ${response.statusText}`);
    }
    
    const users = await response.json();
    console.log("Usuários no Clerk (Total):", users.length);
    
    const matches = users.filter(u => {
        const fullName = `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
        const email = (u.email_addresses?.[0]?.email_address || "").toLowerCase();
        return fullName.includes("bruno") || email.includes("bruno");
    });
    
    console.log("Correspondências para 'Bruno':");
    matches.forEach(u => {
        console.log({
            id: u.id,
            firstName: u.first_name,
            lastName: u.last_name,
            email: u.email_addresses?.[0]?.email_address,
            username: u.username
        });
    });
}

main().catch(console.error);
