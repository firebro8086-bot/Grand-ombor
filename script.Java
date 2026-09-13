// Пример сервера на Node.js / Express
const express = require('express');
const app = express();
app.use(express.json());

// Получить все товары из облака
app.get('/api/products', async (req, res) => {
    const products = await ProductModel.find();
    res.json(products);
});

// Сохранить изменения товара в облаке
app.put('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;
    await ProductModel.findByIdAndUpdate(id, updatedData);
    res.json({ success: true });
});

app.listen(3000, () => console.log('Сервер запущен на порту 3000'));// Загрузка товаров из облака
async function renderProducts() {
    const response = await fetch('/api/products');
    products = await response.json();
    
    // ... ваш текущий код отрисовки таблицы ...
}

// Изменение товара в облаке
async function saveEditedProduct() {
    const id = document.getElementById("editProductId").value;
    const updatedData = {
        name: document.getElementById("editProductName").value,
        quantity: Number(document.getElementById("editProductQuantity").value),
        lowLimit: Number(document.getElementById("editLowLimit").value)
    };

    await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
    });

    closeEditModal();
    renderProducts();
}