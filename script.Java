<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<script>
const SUPABASE_URL = "https://szgtlkykyfacjliisigf.supabase.co";
const SUPABASE_KEY = "sb_publishable_yFGFSQb4K_gR-3KTqckJlQ_rF__5tfI";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

let products = [];


// =========================
// ЗАГРУЗКА ТОВАРОВ
// =========================

async function loadProducts() {

    const { data, error } = await db
        .from("products")
        .select("*")
        .order("id", { ascending: true });

    if (error) {
        console.error(error);
        alert("Xatolik: mahsulotlarni yuklab bo‘lmadi!");
        return;
    }

    products = data || [];

    renderProducts();
}


// =========================
// RASM -> BASE64
// =========================

function imageToBase64(file) {

    return new Promise((resolve, reject) => {

        const reader = new FileReader();

        reader.onload = () => resolve(reader.result);

        reader.onerror = reject;

        reader.readAsDataURL(file);

    });

}


// =========================
// MAHSULOT QO'SHISH
// =========================

async function addProduct() {

    const name =
        document.getElementById("productName").value.trim();

    const quantity =
        Number(document.getElementById("productQuantity").value);

    const lowLimit =
        Number(document.getElementById("lowLimit").value);

    const imageFile =
        document.getElementById("productImage").files[0];


    if (!name) {
        alert("Mahsulot nomini kiriting!");
        return;
    }

    if (isNaN(quantity) || quantity < 0) {
        alert("Miqdorni to‘g‘ri kiriting!");
        return;
    }

    if (!imageFile) {
        alert("Mahsulot rasmini tanlang!");
        return;
    }

    if (isNaN(lowLimit) || lowLimit < 0) {
        alert("Minimal miqdorni to‘g‘ri kiriting!");
        return;
    }


    try {

        const image = await imageToBase64(imageFile);


        const { error } = await db
            .from("products")
            .insert([{
                name: name,
                quantity: quantity,
                low_limit: lowLimit,
                image: image
            }]);


        if (error) {
            console.error(error);
            alert("Mahsulotni saqlashda xatolik!");
            return;
        }


        clearForm();

        await loadProducts();

    } catch (error) {

        console.error(error);

        alert("Xatolik yuz berdi!");

    }

}


// =========================
// FORM TOZALASH
// =========================

function clearForm() {

    document.getElementById("productName").value = "";

    document.getElementById("productQuantity").value = "";

    document.getElementById("lowLimit").value = "5";

    document.getElementById("productImage").value = "";

}


// =========================
// HOLAT
// =========================

function getStatus(product) {

    if (product.quantity === 0) {

        return `<span class="status out">TUGADI</span>`;

    }

    if (product.quantity <= product.low_limit) {

        return `<span class="status low">KAM QOLDI</span>`;

    }

    return `<span class="status ok">YETARLI</span>`;

}


// =========================
// MAHSULOTLARNI KO'RSATISH
// =========================

function renderProducts() {

    const table =
        document.getElementById("productTable");

    const search =
        document.getElementById("search")
        .value
        .toLowerCase();


    const filtered =
        products.filter(product =>
            product.name
            .toLowerCase()
            .includes(search)
        );


    if (filtered.length === 0) {

        table.innerHTML = `
            <tr>
                <td colspan="5" class="empty">
                    Mahsulot topilmadi
                </td>
            </tr>
        `;

    } else {

        table.innerHTML = filtered.map(product => `

            <tr>

                <td>
                    <strong>
                        ${escapeHTML(product.name)}
                    </strong>
                </td>

                <td>

                    <span class="quantity ${
                        product.quantity === 0
                        ? "out-text"
                        : product.quantity <= product.low_limit
                        ? "low-text"
                        : ""
                    }">
                        ${product.quantity}
                    </span>

                </td>

                <td>
                    ${product.low_limit}
                </td>

                <td>
                    ${getStatus(product)}
                </td>

                <td>

                    <div class="actions">

                        <button
                            class="action-btn"
                            onclick="changeQuantity(${product.id}, -1)">
                            −
                        </button>

                        <button
                            class="action-btn"
                            onclick="changeQuantity(${product.id}, 1)">
                            +
                        </button>

                        <input
                            class="quantity-input"
                            id="input-${product.id}"
                            type="number"
                            min="0"
                            placeholder="Son"
                        >

                        <button
                            class="action-btn"
                            onclick="changeByInput(${product.id}, -1)">
                            − SON
                        </button>

                        <button
                            class="action-btn"
                            onclick="changeByInput(${product.id}, 1)">
                            + SON
                        </button>

                        <button
                            class="action-btn edit-btn"
                            onclick="openEditModal(${product.id})">
                            TAHRIRLASH
                        </button>

                        <button
                            class="action-btn delete-btn"
                            onclick="deleteProduct(${product.id})">
                            O‘CHIRISH
                        </button>

                    </div>

                </td>

            </tr>

        `).join("");

    }


    updateStats();

    showWarnings();

}


// =========================
// + / -
// =========================

async function changeQuantity(id, amount) {

    const product =
        products.find(p => p.id === id);

    if (!product) return;


    let newQuantity =
        product.quantity + amount;


    if (newQuantity < 0) {
        newQuantity = 0;
    }


    const { error } = await db
        .from("products")
        .update({
            quantity: newQuantity
        })
        .eq("id", id);


    if (error) {

        console.error(error);

        alert("Xatolik!");

        return;
    }


    await loadProducts();

}


// =========================
// KIRITILGAN SON
// =========================

async function changeByInput(id, operation) {

    const input =
        document.getElementById(`input-${id}`);


    const amount =
        Number(input.value);


    if (isNaN(amount) || amount <= 0) {

        alert("Avval son kiriting!");

        input.focus();

        return;
    }


    const product =
        products.find(p => p.id === id);

    if (!product) return;


    let newQuantity;


    if (operation === 1) {

        newQuantity =
            product.quantity + amount;

    } else {

        newQuantity =
            product.quantity - amount;

    }


    if (newQuantity < 0) {
        newQuantity = 0;
    }


    const { error } = await db
        .from("products")
        .update({
            quantity: newQuantity
        })
        .eq("id", id);


    if (error) {

        console.error(error);

        alert("Xatolik!");

        return;
    }


    input.value = "";

    await loadProducts();

}


// =========================
// EDIT MODAL
// =========================

function openEditModal(id) {

    const product =
        products.find(p => p.id === id);

    if (!product) return;


    document.getElementById("editProductId").value =
        product.id;

    document.getElementById("editProductName").value =
        product.name;

    document.getElementById("editProductQuantity").value =
        product.quantity;

    document.getElementById("editLowLimit").value =
        product.low_limit;

    document.getElementById("editProductImage").value =
        "";


    document.getElementById("editModal").style.display =
        "flex";

}


// =========================
// CLOSE MODAL
// =========================

function closeEditModal() {

    document.getElementById("editModal").style.display =
        "none";

}


// =========================
// SAQLASH
// =========================

async function saveEditedProduct() {

    const id =
        Number(
            document.getElementById("editProductId").value
        );


    const product =
        products.find(p => p.id === id);

    if (!product) return;


    const newName =
        document
        .getElementById("editProductName")
        .value
        .trim();


    const newQuantity =
        Number(
            document.getElementById("editProductQuantity").value
        );


    const newLowLimit =
        Number(
            document.getElementById("editLowLimit").value
        );


    const imageFile =
        document
        .getElementById("editProductImage")
        .files[0];


    if (!newName) {

        alert("Mahsulot nomini kiriting!");

        return;

    }


    if (isNaN(newQuantity) || newQuantity < 0) {

        alert("Miqdorni to‘g‘ri kiriting!");

        return;

    }


    if (isNaN(newLowLimit) || newLowLimit < 0) {

        alert("Minimal miqdorni to‘g‘ri kiriting!");

        return;

    }


    let updateData = {

        name: newName,

        quantity: newQuantity,

        low_limit: newLowLimit

    };


    if (imageFile) {

        updateData.image =
            await imageToBase64(imageFile);

    }


    const { error } = await db
        .from("products")
        .update(updateData)
        .eq("id", id);


    if (error) {

        console.error(error);

        alert("Saqlashda xatolik!");

        return;

    }


    closeEditModal();

    await loadProducts();

}


// =========================
// O'CHIRISH
// =========================

async function deleteProduct(id) {

    const product =
        products.find(p => p.id === id);

    if (!product) return;


    if (!confirm(
        `"${product.name}" mahsulotini o‘chirmoqchimisiz?`
    )) return;


    const { error } = await db
        .from("products")
        .delete()
        .eq("id", id);


    if (error) {

        console.error(error);

        alert("O‘chirishda xatolik!");

        return;

    }


    await loadProducts();

}


// =========================
// STATISTIKA
// =========================

function updateStats() {

    document.getElementById("productCount")
        .textContent =
        products.length;


    const total =
        products.reduce(
            (sum, product) =>
                sum + Number(product.quantity),
            0
        );


    document.getElementById("totalStock")
        .textContent =
        total;


    const low =
        products.filter(
            product =>
                Number(product.quantity)
                <= Number(product.low_limit)
        ).length;


    document.getElementById("lowStock")
        .textContent =
        low;

}


// =========================
// OGOHLANTIRISH
// =========================

function showWarnings() {

    const warning =
        document.getElementById("warning");


    const lowProducts =
        products.filter(
            product =>
                Number(product.quantity)
                <= Number(product.low_limit)
        );


    if (lowProducts.length === 0) {

        warning.style.display = "none";

        return;

    }


    warning.style.display = "block";


    warning.innerHTML =
        "⚠️ <strong>DIQQAT!</strong> " +

        lowProducts
        .map(product =>
            `${escapeHTML(product.name)} — ${product.quantity} dona qoldi`
        )
        .join(" &nbsp; | &nbsp; ");

}


// =========================
// XAVFSIZ TEXT
// =========================

function escapeHTML(text) {

    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// =========================
// START
// =========================

loadProducts();

</script>
