
const SUPABASE_URL = "https://szgtlkykyfacjliisigf.supabase.co";
const SUPABASE_KEY = "sb_publishable_yFGFSQb4K_gR-3KTqckJlQ_rF__5tfI";

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

let products = [];

/* =========================
   ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
========================= */

function numberValue(value, fallback = 0) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return fallback;
    }

    return Math.max(0, Math.floor(number));
}

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function normalizeProduct(product) {
    return {
        id: product.id,
        name: String(product.name ?? ""),
        quantity: numberValue(product.quantity),
        lowLimit: numberValue(product.low_limit)
    };
}

function getStatus(product) {

    if (product.quantity === 0) {
        return `<span class="status out">TUGAGAN</span>`;
    }

    if (product.quantity <= product.lowLimit) {
        return `<span class="status low">KAM QOLDI</span>`;
    }

    return `<span class="status ok">YETARLI</span>`;
}


/* =========================
   ЗАГРУЗКА ТОВАРОВ
========================= */

async function loadProducts(showError = true) {

    const { data, error } = await db
        .from("products")
        .select("id, created_at, name, quantity, low_limit, image")
        .order("created_at", {
            ascending: false
        });

    if (error) {

        console.error(error);

        if (showError) {
            showMessage(
                "Ma’lumotlarni yuklashda xatolik: " + error.message,
                "error"
            );
        }

        return;
    }

    products = (data || []).map(normalizeProduct);

    renderProducts();
}


/* =========================
   ДОБАВЛЕНИЕ ТОВАРА
========================= */

async function addProduct() {

    const nameInput =
        document.getElementById("productName");

    const quantityInput =
        document.getElementById("productQuantity");

    const lowLimitInput =
        document.getElementById("lowLimit");


    const name =
        nameInput.value.trim();

    const quantity =
        numberValue(quantityInput.value, -1);

    const lowLimit =
        numberValue(lowLimitInput.value, -1);


    if (!name) {

        showMessage(
            "Mahsulot nomini kiriting!",
            "error"
        );

        nameInput.focus();

        return;
    }


    if (quantity < 0) {

        showMessage(
            "Miqdorni to‘g‘ri kiriting!",
            "error"
        );

        quantityInput.focus();

        return;
    }


    if (lowLimit < 0) {

        showMessage(
            "Minimal miqdorni to‘g‘ri kiriting!",
            "error"
        );

        lowLimitInput.focus();

        return;
    }


    const button =
        document.getElementById("addBtn");

    button.disabled = true;


    const { error } = await db
        .from("products")
        .insert({

            name: name,

            quantity: quantity,

            low_limit: lowLimit,

            image: null
        });


    button.disabled = false;


    if (error) {

        console.error(error);

        showMessage(
            "Qo‘shishda xatolik: " + error.message,
            "error"
        );

        return;
    }


    nameInput.value = "";

    quantityInput.value = "";

    lowLimitInput.value = "5";


    showMessage(
        "Mahsulot muvaffaqiyatli qo‘shildi.",
        "success"
    );


    await loadProducts(false);
}


/* =========================
   ИЗМЕНЕНИЕ КОЛИЧЕСТВА
========================= */

async function updateQuantity(id, quantity) {

    quantity = numberValue(quantity);


    const { error } = await db
        .from("products")
        .update({
            quantity: quantity
        })
        .eq("id", id);


    if (error) {

        console.error(error);

        showMessage(
            "Miqdorni saqlashda xatolik: " + error.message,
            "error"
        );

        return false;
    }


    return true;
}


async function changeQuantity(id, amount) {

    const product =
        products.find(p => p.id === id);


    if (!product) {
        return;
    }


    const newQuantity =
        Math.max(
            0,
            product.quantity + amount
        );


    const success =
        await updateQuantity(
            id,
            newQuantity
        );


    if (!success) {
        return;
    }


    product.quantity =
        newQuantity;


    renderProducts();
}


async function setQuantity(id, input) {

    const value =
        input.value.trim();


    if (
        value === "" ||
        !/^\d+$/.test(value)
    ) {

        showMessage(
            "Faqat butun son kiriting.",
            "error"
        );

        await loadProducts(false);

        return;
    }


    const quantity =
        Number(value);


    const success =
        await updateQuantity(
            id,
            quantity
        );


    if (!success) {
        return;
    }


    const product =
        products.find(p => p.id === id);


    if (product) {
        product.quantity = quantity;
    }


    showMessage(
        "Miqdor saqlandi.",
        "success"
    );


    renderProducts();
}


/* =========================
   МИНИМАЛЬНОЕ КОЛИЧЕСТВО
========================= */

async function setLowLimit(id, input) {

    const value =
        input.value.trim();


    if (
        value === "" ||
        !/^\d+$/.test(value)
    ) {

        showMessage(
            "Minimal miqdor uchun butun son kiriting.",
            "error"
        );

        await loadProducts(false);

        return;
    }


    const lowLimit =
        Number(value);


    const { error } = await db
        .from("products")
        .update({
            low_limit: lowLimit
        })
        .eq("id", id);


    if (error) {

        console.error(error);

        showMessage(
            "Minimal miqdorni saqlashda xatolik: " +
            error.message,
            "error"
        );

        return;
    }


    const product =
        products.find(p => p.id === id);


    if (product) {
        product.lowLimit = lowLimit;
    }


    showMessage(
        "Minimal miqdor saqlandi.",
        "success"
    );


    renderProducts();
}


/* =========================
   РЕДАКТИРОВАНИЕ
========================= */

function openEdit(id) {

    const product =
        products.find(p => p.id === id);


    if (!product) {
        return;
    }


    document.getElementById("editId").value =
        product.id;


    document.getElementById("editName").value =
        product.name;


    document.getElementById("editQuantity").value =
        product.quantity;


    document.getElementById("editLowLimit").value =
        product.lowLimit;


    document
        .getElementById("editModal")
        .classList.add("show");


    setTimeout(() => {

        document
            .getElementById("editName")
            .focus();

    }, 80);
}


function closeEdit() {

    document
        .getElementById("editModal")
        .classList.remove("show");
}


async function saveEdit() {

    const id =
        Number(
            document.getElementById("editId").value
        );


    const name =
        document.getElementById("editName")
            .value
            .trim();


    const quantityValue =
        document.getElementById("editQuantity")
            .value
            .trim();


    const lowLimitValue =
        document.getElementById("editLowLimit")
            .value
            .trim();


    if (!name) {

        showMessage(
            "Mahsulot nomini kiriting!",
            "error"
        );

        return;
    }


    if (
        !/^\d+$/.test(quantityValue) ||
        !/^\d+$/.test(lowLimitValue)
    ) {

        showMessage(
            "Miqdorlar faqat butun son bo‘lishi kerak.",
            "error"
        );

        return;
    }


    const quantity =
        Number(quantityValue);


    const lowLimit =
        Number(lowLimitValue);


    const { error } = await db
        .from("products")
        .update({

            name: name,

            quantity: quantity,

            low_limit: lowLimit

        })
        .eq("id", id);


    if (error) {

        console.error(error);

        showMessage(
            "Tahrirlashda xatolik: " +
            error.message,
            "error"
        );

        return;
    }


    closeEdit();


    showMessage(
        "Mahsulot yangilandi.",
        "success"
    );


    await loadProducts(false);
}


/* =========================
   УДАЛЕНИЕ
========================= */

async function deleteProduct(id) {

    const product =
        products.find(p => p.id === id);


    if (!product) {
        return;
    }


    const confirmed =
        confirm(
            `"${product.name}" mahsulotini o‘chirmoqchimisiz?`
        );


    if (!confirmed) {
        return;
    }


    const { error } = await db
        .from("products")
        .delete()
        .eq("id", id);


    if (error) {

        console.error(error);

        showMessage(
            "O‘chirishda xatolik: " +
            error.message,
            "error"
        );

        return;
    }


    showMessage(
        "Mahsulot o‘chirildi.",
        "success"
    );


    await loadProducts(false);
}


/* =========================
   ТАБЛИЦА
========================= */

function renderProducts() {

    const table =
        document.getElementById("productTable");


    const search =
        document.getElementById("search")
            .value
            .trim()
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

        table.innerHTML =
            filtered.map(product => `

                <tr>

                    <td class="product-name-cell">
                        <strong>
                            ${escapeHTML(product.name)}
                        </strong>
                    </td>


                    <td>

                        <input
                            class="table-input quantity-input"
                            type="number"
                            min="0"
                            step="1"
                            value="${product.quantity}"
                        >

                    </td>


                    <td>

                        <input
                            class="table-input minimum-input"
                            type="number"
                            min="0"
                            step="1"
                            value="${product.lowLimit}"
                        >

                    </td>


                    <td>
                        ${getStatus(product)}
                    </td>


                    <td>

                        <div class="actions">

                            <button
                                class="action-btn square-btn"
                                title="1 taga kamaytirish"
                                onclick="changeQuantity(${product.id}, -1)"
                            >
                                −
                            </button>


                            <button
                                class="action-btn square-btn"
                                title="1 taga oshirish"
                                onclick="changeQuantity(${product.id}, 1)"
                            >
                                +
                            </button>


                            <button
                                class="action-btn edit-btn"
                                onclick="openEdit(${product.id})"
                            >
                                TAHRIRLASH
                            </button>


                            <button
                                class="action-btn delete-btn"
                                onclick="deleteProduct(${product.id})"
                            >
                                O‘CHIRISH
                            </button>

                        </div>

                    </td>

                </tr>

            `).join("");


        table
            .querySelectorAll(".quantity-input")
            .forEach(input => {

                const row =
                    input.closest("tr");


                const index =
                    [
                        ...table.querySelectorAll("tr")
                    ].indexOf(row);


                const product =
                    filtered[index];


                input.addEventListener(
                    "change",
                    () =>
                        setQuantity(
                            product.id,
                            input
                        )
                );


                input.addEventListener(
                    "keydown",
                    event => {

                        if (event.key === "Enter") {

                            event.preventDefault();

                            input.blur();
                        }

                    }
                );

            });


        table
            .querySelectorAll(".minimum-input")
            .forEach(input => {

                const row =
                    input.closest("tr");


                const index =
                    [
                        ...table.querySelectorAll("tr")
                    ].indexOf(row);


                const product =
                    filtered[index];


                input.addEventListener(
                    "change",
                    () =>
                        setLowLimit(
                            product.id,
                            input
                        )
                );


                input.addEventListener(
                    "keydown",
                    event => {

                        if (event.key === "Enter") {

                            event.preventDefault();

                            input.blur();
                        }

                    }
                );

            });
    }


    updateStats();

    renderStockNotifications();

    renderOutPopup();
}


/* =========================
   СТАТИСТИКА
========================= */

function updateStats() {

    document.getElementById("productCount")
        .textContent = products.length;


    const total =
        products.reduce(
            (sum, product) =>
                sum + product.quantity,
            0
        );


    document.getElementById("totalStock")
        .textContent = total;


    const low =
        products.filter(product =>
            product.quantity > 0 &&
            product.quantity <= product.lowLimit
        ).length;


    const out =
        products.filter(product =>
            product.quantity === 0
        ).length;


    document.getElementById("lowStock")
        .textContent = low;


    document.getElementById("outStock")
        .textContent = out;
}


/* =========================
   СТАРЫЕ УВЕДОМЛЕНИЯ
========================= */

function renderStockNotifications() {

    const box =
        document.getElementById("notifications");


    const important =
        products.filter(product =>
            product.quantity === 0 ||
            product.quantity <= product.lowLimit
        );


    if (important.length === 0) {

        box.innerHTML = `
            <div class="notification empty-notification">
                Hozircha muhim bildirishnoma yo‘q.
            </div>
        `;

        return;
    }


    box.innerHTML =
        important.map(product => {

            const out =
                product.quantity === 0;


            return `

                <div class="
                    notification
                    ${
                        out
                            ? "notification-out"
                            : "notification-low"
                    }
                ">

                    <div class="notification-icon">
                        !
                    </div>


                    <div class="notification-text">

                        <strong>
                            ${escapeHTML(product.name)}
                        </strong>


                        <span>

                            ${
                                out

                                    ? "Mahsulot tugagan — 0 dona."

                                    : `Faqat ${product.quantity} dona qoldi.
                                       Minimal miqdor:
                                       ${product.lowLimit} dona.`
                            }

                        </span>

                    </div>


                    <button
                        class="notification-edit"
                        onclick="openEdit(${product.id})"
                    >
                        KO‘RISH
                    </button>

                </div>

            `;

        }).join("");
}


/* =========================
   НОВОЕ ОКНО:
   ТОВАРЫ С 0
========================= */

function renderOutPopup() {

    const list =
        document.getElementById("outPopupList");


    const badge =
        document.getElementById("outBadge");


    if (!list || !badge) {
        return;
    }


    const outProducts =
        products.filter(product =>
            product.quantity === 0
        );


    /* количество на колокольчике */

    badge.textContent =
        outProducts.length;


    if (outProducts.length === 0) {

        badge.classList.add("hidden");

    } else {

        badge.classList.remove("hidden");
    }


    /* содержимое окна */

    if (outProducts.length === 0) {

        list.innerHTML = `
            <div class="out-popup-empty">
                Hozircha tugagan mahsulot yo‘q.
            </div>
        `;

        return;
    }


    list.innerHTML =
        outProducts.map(product => `

            <div class="out-popup-item">

                <div class="out-popup-info">

                    <strong>
                        ${escapeHTML(product.name)}
                    </strong>

                    <span>
                        0 dona
                    </span>

                </div>


                <button
                    type="button"
                    onclick="openEdit(${product.id})"
                    class="out-popup-view"
                >
                    KO‘RISH
                </button>

            </div>

        `).join("");
}


/* =========================
   ОТКРЫТЬ / ЗАКРЫТЬ POPUP
========================= */

function toggleOutPopup() {

    const popup =
        document.getElementById("outPopup");


    if (!popup) {
        return;
    }


    const isOpen =
        popup.classList.contains("show");


    if (isOpen) {

        closeOutPopup();

    } else {

        popup.classList.add("show");

        popup.setAttribute(
            "aria-hidden",
            "false"
        );

        renderOutPopup();
    }
}


function closeOutPopup() {

    const popup =
        document.getElementById("outPopup");


    if (!popup) {
        return;
    }


    popup.classList.remove("show");


    popup.setAttribute(
        "aria-hidden",
        "true"
    );
}


/* =========================
   СООБЩЕНИЯ
========================= */

function showMessage(text, type) {

    const message =
        document.getElementById("message");


    message.textContent = text;


    message.className =
        "message " + type;


    clearTimeout(showMessage.timer);


    showMessage.timer =
        setTimeout(() => {

            message.className =
                "message";


            message.textContent =
                "";

        }, 3500);
}


/* =========================
   ПОИСК
========================= */

document
    .getElementById("search")
    .addEventListener(
        "input",
        renderProducts
    );


/* =========================
   ENTER В ПОЛЯХ
========================= */

document
    .getElementById("productName")
    .addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                document
                    .getElementById(
                        "productQuantity"
                    )
                    .focus();

            }

        }
    );


document
    .getElementById("productQuantity")
    .addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                document
                    .getElementById(
                        "lowLimit"
                    )
                    .focus();

            }

        }
    );


document
    .getElementById("lowLimit")
    .addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                addProduct();

            }

        }
    );


/* =========================
   EDIT MODAL
========================= */

document
    .getElementById("editModal")
    .addEventListener(
        "click",
        event => {

            if (
                event.target.id === "editModal"
            ) {

                closeEdit();

            }

        }
    );


/* =========================
   ESC
========================= */

document.addEventListener(
    "keydown",
    event => {

        if (event.key === "Escape") {

            closeEdit();

            closeOutPopup();

        }

    }
);


/* =========================
   КЛИК СНАРУЖИ POPUP
========================= */

document.addEventListener(
    "click",
    event => {

        const popup =
            document.getElementById("outPopup");


        const bell =
            document.getElementById("outBell");


        if (!popup || !bell) {
            return;
        }


        if (
            popup.classList.contains("show") &&
            !popup.contains(event.target) &&
            !bell.contains(event.target)
        ) {

            closeOutPopup();

        }

    }
);


/* =========================
   ЗАПУСК
========================= */

loadProducts();


/* =========================
   АВТООБНОВЛЕНИЕ
========================= */

setInterval(
    () => loadProducts(false),
    5000
);
