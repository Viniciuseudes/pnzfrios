const buscarCliente = async () => {
    try {
        const response = await fetch("https://api-sandbox.baseerp.com.br/api/v1/customers/104121182", {
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
                "access_token": "$aeact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6Ojg1M2JiZWMyLWYzNzItNDExNC04MmIwLTg1M2UxMWE3YTRjOTo6JGFlYWNoX2MyODNjYTIyLTE3ZDYtNDgwNi1hMDI0LTAyMDQ5YjMyN2RlNw=="
            }
        });
        
        const data = await response.json();
        console.log("🕵️ JSON DA WALTERNIRA (O CLIENTE PERFEITO):");
        console.log(JSON.stringify(data, null, 2));
    } catch (erro) {
        console.error("Erro na busca:", erro);
    }
}

buscarCliente();