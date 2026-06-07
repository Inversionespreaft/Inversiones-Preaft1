const idCatalogoActual = 7;
const slugActual = "InversionesPreaft";
const numeroWhatsApp = "986820428";
const nombreCatalogo = "TÍO BELY LICORERÍA";

const cart = [];
let currentProduct = null;
let selectedOption = null;
let modalQty = 1;

const modal = document.getElementById('productModal');
const productGrid = document.getElementById('productGrid');
const modalImg = document.getElementById('modalImg');
const modalNombre = document.getElementById('modalNombre');
const modalDescripcion = document.getElementById('modalDescripcion');
const modalPriceDisplay = document.getElementById('modalPriceDisplay');
const modalOptionsContainer = document.getElementById('modalOptionsContainer');
const modalVariationsContainer = document.getElementById('modalVariationsContainer');
const modalQtyInput = document.getElementById('modalQtyInput');
const modalBtnBuyNow = document.getElementById('modalBtnBuyNow');
const cartCount = document.getElementById('cartCount');
const cartBody = document.getElementById('cartBody');
const cartFooter = document.getElementById('cartFooter');
const cartSidebar = document.getElementById('cartSidebar');
const cartFloatIcon = document.querySelector('.cart-float-icon');
const overlayDark = document.querySelector('.overlay-dark');
const orderTypeModal = document.getElementById('orderTypeModal');

function parseJSON(value, fallback = []) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function getCategoryIconClass(text) {
  const label = text.toLowerCase();
  if (label.includes('cerveza')) return 'fa-beer';
  if (label.includes('vodka')) return 'fa-wine-bottle';
  if (label.includes('whisky') || label.includes('whiskey')) return 'fa-glass-whiskey';
  if (label.includes('ron')) return 'fa-cocktail';
  if (label.includes('tequila')) return 'fa-flask';
  if (label.includes('pisco')) return 'fa-cocktail';
  if (label.includes('jager') || label.includes('jagger')) return 'fa-bottle-water';
  if (label.includes('vino') || label.includes('champagne') || label.includes('espumante')) return 'fa-wine-glass';
  if (label.includes('gaseosa') || label.includes('bebida') || label.includes('agua') || label.includes('energia') || label.includes('red bull')) return 'fa-glass-water';
  if (label.includes('snack') || label.includes('golosina') || label.includes('papa') || label.includes('piqueo') || label.includes('trident')) return 'fa-cookie-bite';
  if (label.includes('bazar') || label.includes('envase') || label.includes('bolsa') || label.includes('vaso') || label.includes('personal') || label.includes('preservativo')) return 'fa-box-open';
  return 'fa-tags';
}

function getCategoryName(text) {
  const label = text.toLowerCase();
  if (label.includes('cerveza')) return 'Cerveza';
  if (label.includes('vodka')) return 'Vodka';
  if (label.includes('whisky') || label.includes('whiskey')) return 'Whisky';
  if (label.includes('ron')) return 'Ron';
  if (label.includes('tequila')) return 'Tequila';
  if (label.includes('pisco')) return 'Pisco';
  if (label.includes('jager') || label.includes('jagger')) return 'Jägermeister';
  if (label.includes('vino') || label.includes('champagne') || label.includes('espumante')) return 'Vino';
  if (label.includes('agua')) return 'Agua';
  if (label.includes('gaseosa')) return 'Gaseosa';
  if (label.includes('bebida') || label.includes('energia') || label.includes('red bull') || label.includes('jugo')) return 'Bebida';
  if (label.includes('snack') || label.includes('golosina') || label.includes('papa') || label.includes('piqueo')) return 'Snack';
  if (label.includes('cigarro')) return 'Cigarros';
  if (label.includes('crema') || label.includes('jarabe') || label.includes('licor')) return 'Cremas';
  if (label.includes('bazar') || label.includes('envase') || label.includes('bolsa') || label.includes('vaso') || label.includes('personal') || label.includes('preservativo')) return 'Bazar';
  return 'Producto';
}

function addCategoryBadgesToCards() {
  return;
  const cards = document.querySelectorAll('.product-card');
  cards.forEach((card) => {
    // Evitar agregar múltiples badges
    if (card.querySelector('.category-badge')) return;
    
    const nombre = card.dataset.nombre || '';
    const iconClass = getCategoryIconClass(nombre);
    const categoryName = getCategoryName(nombre);
    
    // Crear badge con icono y nombre de categoría
    const badge = document.createElement('div');
    badge.className = 'category-badge';
    badge.innerHTML = `<i class="fas ${iconClass}"></i> <span>${categoryName}</span>`;
    
    // Insertar el badge en la tarjeta (debajo de la imagen)
    const imageContainer = card.querySelector('.product-image-container');
    if (imageContainer) {
      imageContainer.appendChild(badge);
    }
  });
}

function addProductImageOverlayCategory() {
  return;
  const cards = document.querySelectorAll('.product-card');
  cards.forEach((card) => {
    const imageContainer = card.querySelector('.product-image-container');
    if (!imageContainer || imageContainer.querySelector('.product-category-tag')) return;
    
    const nombre = card.dataset.nombre || '';
    const categoryName = getCategoryName(nombre);
    
    const categoryTag = document.createElement('div');
    categoryTag.className = 'product-category-tag';
    categoryTag.textContent = categoryName;
    imageContainer.appendChild(categoryTag);
  });
}

function getFirstOptionFromCard(card) {
  const options = parseJSON(card.dataset.opciones, []);
  return options.length > 0 ? options[0] : null;
}

function decorateProductCards() {
  const cards = document.querySelectorAll('.product-card');
  cards.forEach((card) => {
    if (card.querySelector('.quick-add-btn')) return;

    const option = getFirstOptionFromCard(card);
    if (option?.en_oferta && option.precio_normal > option.precio_final) {
      const discount = Math.round(((option.precio_normal - option.precio_final) / option.precio_normal) * 100);
      const imageContainer = card.querySelector('.product-image-container');
      if (imageContainer && !imageContainer.querySelector('.discount-badge')) {
        const badge = document.createElement('span');
        badge.className = 'discount-badge';
        badge.textContent = `-${discount}%`;
        imageContainer.appendChild(badge);
      }
    }

    const quickAdd = document.createElement('button');
    quickAdd.className = 'quick-add-btn';
    quickAdd.type = 'button';
    quickAdd.setAttribute('aria-label', 'Agregar producto');
    quickAdd.innerHTML = '<i class="fas fa-plus"></i>';
    quickAdd.addEventListener('click', (event) => {
      event.stopPropagation();
      abrirModal(card);
    });
    card.appendChild(quickAdd);
  });
}

function initCategoryIcons() {
  const nodes = Array.from(document.querySelectorAll('.category-item, .mobile-nav-link'));
  nodes.forEach((node) => {
    const text = node.textContent.trim();
    if (!text || node.querySelector('.category-icon')) return;
    const iconName = getCategoryIconClass(text);
    node.innerHTML = `
      <span class="category-icon"><i class="fas ${iconName}"></i></span>
      <span class="category-label">${text}</span>
    `;
  });
  // Agregar badges de categoría a las tarjetas de producto
  addCategoryBadgesToCards();
  addProductImageOverlayCategory();
}

function addCardAccessibility() {
  const cards = document.querySelectorAll('.product-card');
  cards.forEach((card) => {
    card.setAttribute('tabindex', '0');
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        abrirModal(card);
      }
    });
  });
}

function initSearch() {
  const searchInput = document.getElementById('productSearchInput');
  if (!searchInput) return;
  let timeout;
  searchInput.addEventListener('input', (event) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      filtrarProductos({ search: event.target.value });
    }, 250);
  });
}

function initOverlayListeners() {
  if (!modal) return;
  modal.addEventListener('click', (event) => {
    if (event.target === modal) cerrarModal();
  });
  if (overlayDark) {
    overlayDark.addEventListener('click', () => {
      document.querySelector('.offcanvas-menu')?.classList.remove('active');
      overlayDark.classList.remove('active');
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  addCardAccessibility();
  initCategoryIcons();
  decorateProductCards();
  initSearch();
  initOverlayListeners();
  updateCartUI();
  if (!sessionStorage.getItem('preaftOrderModalSeen')) {
    setTimeout(() => openOrderModal(), 700);
    sessionStorage.setItem('preaftOrderModalSeen', '1');
  }
});

function abrirModal(card) {
  const d = card.dataset;
  currentProduct = {
    id: d.id || '',
    nombre: d.nombre || 'Producto',
    imagen: d.imagen || '',
    descripcion: d.descripcion || ''
  };
  selectedOption = null;
  modalQty = 1;

  modalImg.src = currentProduct.imagen;
  modalNombre.textContent = currentProduct.nombre;
  modalDescripcion.textContent = currentProduct.descripcion;
  modalQtyInput.value = modalQty;

  const options = parseJSON(d.opciones, []);
  modalOptionsContainer.innerHTML = '<h4>Elige una presentación:</h4>';
  if (options.length === 0) {
    modalOptionsContainer.innerHTML += '<p class="no-products-message">No hay configuraciones disponibles para este producto.</p>';
  } else {
    options.forEach((opt, index) => {
      const row = document.createElement('div');
      row.className = `option-row${index === 0 ? ' selected' : ''}`;
      const priceHtml = opt.en_oferta
        ? `<span class="precio-tachado">S/ ${opt.precio_normal.toFixed(2)}</span> <span class="option-price-promo">S/ ${opt.precio_final.toFixed(2)}</span> <span class="badge-oferta">Oferta</span>`
        : `<span class="option-price">S/ ${opt.precio_final.toFixed(2)}</span>`;

      row.innerHTML = `
        <label class="option-radio-label">
          <input type="radio" name="modalOption" class="option-radio" ${index === 0 ? 'checked' : ''}>
          <span class="option-label">${opt.label}</span>
        </label>
        <div>${priceHtml}</div>
      `;

      row.addEventListener('click', () => {
        document.querySelectorAll('.option-row').forEach((r) => {
          r.classList.remove('selected');
          r.querySelector('input')?.removeAttribute('checked');
        });
        row.classList.add('selected');
        row.querySelector('input')?.setAttribute('checked', 'checked');
        selectedOption = opt;
        updateModalTotal();
      });

      modalOptionsContainer.appendChild(row);
      if (index === 0) {
        selectedOption = opt;
      }
    });
  }

  const variaciones = parseJSON(d.variaciones, []);
  modalVariationsContainer.innerHTML = '';
  if (variaciones.length > 0) {
    const title = document.createElement('h4');
    title.textContent = 'Opciones adicionales:';
    modalVariationsContainer.appendChild(title);
    variaciones.forEach((variation, index) => {
      const group = document.createElement('div');
      group.className = 'variation-group';
      const select = document.createElement('select');
      select.className = 'variation-select';
      select.id = `var_${index}`;
      variation.opciones.forEach((optionValue) => {
        const option = document.createElement('option');
        option.value = optionValue;
        option.textContent = optionValue;
        select.appendChild(option);
      });
      group.innerHTML = `<label>${variation.nombre}:</label>`;
      group.appendChild(select);
      modalVariationsContainer.appendChild(group);
    });
    modalVariationsContainer.style.display = 'block';
  } else {
    modalVariationsContainer.style.display = 'none';
  }

  updateModalTotal();

  document.getElementById('modalBtnAddCart').onclick = () => {
    if (!selectedOption) return;
    const selectedVars = Array.from(modalVariationsContainer.querySelectorAll('select'))
      .map((select) => `${select.previousElementSibling.textContent.replace(':', '')}: ${select.value}`)
      .filter(Boolean);
    const detalleVars = selectedVars.length > 0 ? ` (${selectedVars.join(', ')})` : '';
    const detalleFinal = `${selectedOption.label}${detalleVars}`.trim();
    const cantidad = selectedOption.cant * modalQty;
    const precioTotal = selectedOption.precio_final * modalQty;
    const precioUnitarioReal = selectedOption.precio_final / selectedOption.cant;

    agregarAlCarrito({
      id: currentProduct.id,
      nombre: currentProduct.nombre,
      imagen: currentProduct.imagen,
      cantidad,
      precioTotal,
      precioUnitarioReal,
      detalle: detalleFinal
    });
    cerrarModal();
  };

  modal.classList.add('visible');
}

function adjustModalQty(delta) {
  const siguiente = modalQty + delta;
  if (siguiente < 1) return;
  modalQty = siguiente;
  modalQtyInput.value = modalQty;
  updateModalTotal();
}

function updateModalTotal() {
  if (!selectedOption) return;
  const total = selectedOption.precio_final * modalQty;
  modalPriceDisplay.textContent = `S/ ${total.toFixed(2)}`;
  actualizarEnlace();
}

function buildWhatsAppMessage(optionDetail) {
  const total = selectedOption ? selectedOption.precio_final * modalQty : 0;
  const lines = [
    `Hola ${nombreCatalogo}!`,
    'Quiero comprar:',
    `*${currentProduct.nombre}*`,
    optionDetail ? `${optionDetail}` : '',
    `Cantidad: ${modalQty}`,
    `Total: S/ ${total.toFixed(2)}`
  ];
  return encodeURIComponent(lines.filter(Boolean).join('\n'));
}

function actualizarEnlace() {
  if (!selectedOption || !modalBtnBuyNow) return;
  const selectedVars = Array.from(modalVariationsContainer.querySelectorAll('select'))
    .map((select) => `${select.previousElementSibling.textContent.replace(':', '')}: ${select.value}`)
    .filter(Boolean);
  let detalle = selectedOption.label;
  if (detalle.startsWith('1 Unidad')) {
    detalle = detalle.replace('1 Unidad', '').trim();
  }
  if (selectedVars.length > 0) {
    detalle += ` (${selectedVars.join(', ')})`;
  }
  const optionDetail = detalle || '';
  modalBtnBuyNow.href = `https://wa.me/${numeroWhatsApp}?text=${buildWhatsAppMessage(optionDetail)}`;
}

function cerrarModal() {
  modal.classList.remove('visible');
}

function cerrarModalOnClickOverlay(event) {
  if (event.target === modal) cerrarModal();
}

function openOrderModal() {
  orderTypeModal?.classList.add('visible');
}

function closeOrderModal() {
  orderTypeModal?.classList.remove('visible');
}

function closeOrderModalOnOverlay(event) {
  if (event.target === orderTypeModal) closeOrderModal();
}

function focusSearch() {
  const input = document.getElementById('productSearchInput');
  input?.focus();
}

function toggleCart() {
  cartSidebar.classList.toggle('open');
}

function agregarAlCarrito(product) {
  const existing = cart.find((item) => item.id === product.id && item.detalle === product.detalle);
  if (existing) {
    existing.cantidad += product.cantidad;
    existing.precioTotal = existing.precioUnitarioReal * existing.cantidad;
  } else {
    cart.push(product);
  }
  updateCartUI();
}

function eliminarDelCarrito(index) {
  cart.splice(index, 1);
  updateCartUI();
}

function cambiarCantidad(index, delta) {
  const item = cart[index];
  if (!item) return;
  const nueva = item.cantidad + delta;
  if (nueva < 1) return;
  item.cantidad = nueva;
  item.precioTotal = item.precioUnitarioReal * nueva;
  updateCartUI();
}

function setCantidad(index, value) {
  const item = cart[index];
  if (!item) return;
  const nueva = parseInt(value, 10);
  if (Number.isNaN(nueva) || nueva < 1) return;
  item.cantidad = nueva;
  item.precioTotal = item.precioUnitarioReal * nueva;
  updateCartUI();
}

function updateCartUI() {
  const totalQty = cart.reduce((sum, item) => sum + item.cantidad, 0);
  cartCount.textContent = totalQty;
  if (cart.length === 0) {
    cartBody.innerHTML = '<p style="text-align:center;color:#999;margin-top:20px">Carrito vacío</p>';
    cartFooter.style.display = 'none';
    cartFloatIcon.classList.remove('visible');
    return;
  }
  cartFloatIcon.classList.add('visible');
  cartFooter.style.display = 'block';

  let total = 0;
  cartBody.innerHTML = cart.map((item, index) => {
    total += item.precioTotal;
    return `
      <div class="cart-item">
        <img src="${item.imagen}" class="cart-item-img" alt="${item.nombre}">
        <div class="cart-item-details">
          <strong>${item.nombre}</strong>
          <p style="font-size:0.85em;color:#777">${item.detalle}</p>
          <p style="font-weight:bold;color:var(--color-principal)">S/ ${item.precioTotal.toFixed(2)}</p>
          <div class="qty-control">
            <button class="qty-btn" onclick="cambiarCantidad(${index}, -1)">-</button>
            <input type="number" class="qty-input" value="${item.cantidad}" onchange="setCantidad(${index}, this.value)">
            <button class="qty-btn" onclick="cambiarCantidad(${index}, 1)">+</button>
          </div>
        </div>
        <button class="cart-item-remove" onclick="eliminarDelCarrito(${index})" aria-label="Eliminar artículo">&times;</button>
      </div>`;
  }).join('');
  document.getElementById('cartTotal').textContent = `S/ ${total.toFixed(2)}`;
}

function enviarPedidoWhatsApp() {
  if (cart.length === 0) return;
  const lines = [`Hola ${nombreCatalogo}! Mi pedido:`, ''];
  let total = 0;
  cart.forEach((item) => {
    lines.push(`*${item.nombre}*`);
    if (item.detalle && item.detalle !== '1 Unidad') {
      lines.push(`  ${item.detalle}`);
    }
    lines.push(`  Cant: ${item.cantidad}`);
    lines.push(`  Subtotal: S/ ${item.precioTotal.toFixed(2)}`);
    lines.push('');
    total += item.precioTotal;
  });
  lines.push(`*Total a pagar: S/ ${total.toFixed(2)}*`);
  window.open(`https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
}

function toggleMobileMenu() {
  document.querySelector('.offcanvas-menu')?.classList.toggle('active');
  overlayDark.classList.toggle('active');
}

function toggleMobileSubmenu(element) {
  const parentLi = element.closest('li');
  const submenu = parentLi?.querySelector('.mobile-sub-menu');
  if (!submenu) return;
  submenu.classList.toggle('open');
  element.classList.toggle('rotate');
}

function setActiveCategory(btn) {
  document.querySelectorAll('.category-item').forEach((item) => item.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

function mostrarMensajeError(mensaje) {
  productGrid.innerHTML = `<div class="no-products-message">${mensaje}</div>`;
}

function filtrarProductos(params, btn) {
  if (btn && btn.classList.contains('category-item')) {
    setActiveCategory(btn);
  }
  productGrid.classList.add('loading');

  const url = new URL('filtrar_productos.php', window.location.href);
  url.searchParams.set('id_catalogo', idCatalogoActual);
  if (params.search) url.searchParams.set('search', params.search);
  if (params.categoria !== undefined) url.searchParams.set('id_categoria', params.categoria);
  url.searchParams.set('_', Date.now());

  fetch(url.toString())
    .then((response) => {
      if (!response.ok) throw new Error('Error en la búsqueda');
      return response.text();
    })
    .then((html) => {
      productGrid.innerHTML = html;
      productGrid.classList.remove('loading');
      addCardAccessibility();
      // Agregar badges de categoría a los nuevos productos
      addCategoryBadgesToCards();
      addProductImageOverlayCategory();
      decorateProductCards();
      initCategoryIcons();
    })
    .catch(() => {
      productGrid.classList.remove('loading');
      if (params.search) {
        filterLocalProducts(params.search);
      } else {
        mostrarMensajeError('No se pudo cargar los productos. Intenta de nuevo más tarde.');
      }
    });
}

function filterLocalProducts(searchTerm) {
  const cards = Array.from(productGrid.querySelectorAll('.product-card'));
  const term = searchTerm.trim().toLowerCase();
  let visibleCount = 0;
  cards.forEach((card) => {
    const title = (card.dataset.nombre || '').toLowerCase();
    const description = (card.dataset.descripcion || '').toLowerCase();
    const visible = term === '' || title.includes(term) || description.includes(term);
    card.style.display = visible ? '' : 'none';
    if (visible) visibleCount += 1;
  });
  // Asegurar que los badges se muestren en la búsqueda local
  addCategoryBadgesToCards();
  addProductImageOverlayCategory();
  decorateProductCards();
  if (visibleCount === 0) {
    mostrarMensajeError('No se encontraron productos para tu búsqueda.');
  }
}
