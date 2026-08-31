const buscarBancos = async () => {
    try {
        const response = await fetch("https://api-sandbox.baseerp.com.br/api/v1/bankAccounts", {
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
                "access_token": "$aeact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6Ojg1M2JiZWMyLWYzNzItNDExNC04MmIwLTg1M2UxMWE3YTRjOTo6JGFlYWNoX2MyODNjYTIyLTE3ZDYtNDgwNi1hMDI0LTAyMDQ5YjMyN2RlNw=="
            }
        });
        
        const data = await response.json();
        console.log("🏦 SUAS CONTAS BANCÁRIAS NO BASE ERP:");
        console.log(JSON.stringify(data, null, 2));
    } catch (erro) {
        console.error("Erro na busca:", erro);
    }
}

buscarBancos();