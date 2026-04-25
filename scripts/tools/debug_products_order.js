const http = require('http');

http.get('http://localhost:3333/products/active', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const products = JSON.parse(data);
            console.log("TOTAL PRODUCTS:", products.length);
            console.log("FIRST 5 PRODUCTS:");
            products.slice(0, 5).forEach((p, i) => {
                console.log(`${i + 1}. [${p.category}] ${p.name} - $${p.price}`);
            });
        } catch (e) {
            console.error("Error parsing response", e);
        }
    });
}).on('error', (err) => {
    console.error("Error fetching products", err);
});
