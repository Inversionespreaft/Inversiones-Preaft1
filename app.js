const idCatalogoActual = 7;
const slugActual = "InversionesPreaft";
const numeroWhatsApp = "986820428";
const numeroWhatsAppSoporte = "986820428";
const nombreCatalogo = "InversionesPreaft";
const cart = [];
let currentProduct = null;
let selectedOption = null;
let modalQty = 1;
let userLoggedIn = false; // Google Sign-In state
let userEmail = null;
let userDiscount = 0; // Descuento en % por login con Google
// image mapping removed — images will be used as-is from HTML/uploads

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
const cartOverlay = document.getElementById('cartOverlay');
const cartFloatIcon = document.querySelector('.cart-float-icon');
const overlayDark = document.querySelector('.overlay-dark');
const orderTypeModal = document.getElementById('orderTypeModal');

// Delivery - variables
let deliveryMap = null;
let deliveryMarker = null;
let selectedDeliveryLocation = null; // { lat, lon, display_name }

function normalizeUploadPaths() {
  document.querySelectorAll('[src^="/uploads/"]').forEach((el) => {
    const v = el.getAttribute('src');
    if (v && v.startsWith('/')) el.src = v.replace(/^\//, '');
  });
  document.querySelectorAll('[data-imagen^="/uploads/"]').forEach((el) => {
    const v = el.getAttribute('data-imagen');
    if (v && v.startsWith('/')) el.setAttribute('data-imagen', v.replace(/^\//, ''));
  });
}

function normalizeText(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
// image mapping utilities removed

// Nominatim search (no API key) - returns up to 6 results
async function nominatimSearch(q) {
  if (!q) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    return [];
  }
}

/*
Note: Nominatim (OpenStreetMap) is free for light usage but has strict usage policies
(https://operations.osmfoundation.org/policies/nominatim/). For production or heavy traffic,
use a geocoding service with an API key (Mapbox, Google Places, Here, etc.) or host your
own Nominatim instance. Browsers cannot set a custom User-Agent header, so heavy client
side calls may be rate-limited; consider proxying requests through your server.
*/

async function nominatimReverse(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

function initDeliveryMap() {
  const mapEl = document.getElementById('deliveryMap');
  if (!mapEl || typeof L === 'undefined') return;
  if (deliveryMap) return;
  deliveryMap = L.map(mapEl).setView([-12.0464, -77.0428], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(deliveryMap);

  deliveryMap.on('click', async (e) => {
    const { lat, lng } = e.latlng;
    const info = await nominatimReverse(lat, lng);
    const display = info?.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    setDeliveryLocation({ lat, lon: lng, display_name: display });
  });
}

function sanitizeAddress(displayName) {
  if (!displayName) return '';
  const parts = displayName.split(',').map((part) => part.trim()).filter(Boolean);

  if (parts.length === 0) return displayName;
  if (/^(grifo|estaci[oó]n|gas|bomba|servicentro|tercer|local)/i.test(parts[0])) {
    return parts.slice(1, 5).join(', ');
  }
  return parts.slice(0, 4).join(', ');
}

function setDeliveryLocation(loc) {
  const cleanName = sanitizeAddress(loc.display_name || '');
  selectedDeliveryLocation = {
    ...loc,
    clean_name: cleanName,
    display_name: cleanName
  };
  const { lat, lon, display_name } = selectedDeliveryLocation;
  const mapEl = document.getElementById('deliveryMap');
  if (!mapEl) return;
  if (!deliveryMap) initDeliveryMap();
  if (deliveryMarker) deliveryMap.removeLayer(deliveryMarker);
  deliveryMarker = L.marker([lat, lon]).addTo(deliveryMap);
  deliveryMap.setView([lat, lon], 16);
  const input = document.getElementById('deliveryAddressInput');
  if (input) input.value = display_name;
  const status = document.getElementById('deliveryAddressStatus');
  if (status) status.textContent = `Dirección seleccionada: ${display_name}`;
  updateCurrentAddressLabel();
}

function updateCurrentAddressLabel() {
  const label = document.getElementById('currentAddressLabel');
  if (label) {
    label.textContent = selectedDeliveryLocation?.clean_name || selectedDeliveryLocation?.display_name || '¿Dónde quieres pedir?';
  }
}

async function acceptDeliveryAddress() {
  const addressInput = document.getElementById('deliveryAddressInput');
  const address = addressInput?.value.trim();
  if (!address) {
    return alert('Escribe o elige una dirección antes de aceptar.');
  }

  const currentAddress = selectedDeliveryLocation?.clean_name || selectedDeliveryLocation?.display_name;
  if (!selectedDeliveryLocation || currentAddress !== address) {
    const results = await nominatimSearch(address);
    if (results.length === 0) {
      return alert('No se encontró la dirección. Intenta con otra selección o escribe una dirección más precisa.');
    }
    const first = results[0];
    setDeliveryLocation({
      lat: parseFloat(first.lat),
      lon: parseFloat(first.lon),
      display_name: first.display_name
    });
  }

  updateCurrentAddressLabel();
  closeOrderModal();
  alert('Dirección aceptada.');
}

function renderAddressSuggestions(items) {
  const ul = document.getElementById('addressSuggestions');
  if (!ul) return;
  ul.innerHTML = '';
  items.forEach((it) => {
    const clean = sanitizeAddress(it.display_name);
    const li = document.createElement('li');
    li.className = 'address-suggestion';
    li.setAttribute('role', 'option');
    li.textContent = clean;
    li.addEventListener('click', () => {
      setDeliveryLocation({ lat: parseFloat(it.lat), lon: parseFloat(it.lon), display_name: it.display_name });
      ul.innerHTML = '';
    });
    ul.appendChild(li);
  });
}

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

function normalizeCategoryKey(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[ -- -]/g, '')
    .replace(/[ -]/g, '')
    .replace(/[ -]/g, '')
    .replace(/[ -]/g, '')
    .replace(/[ -]/g, '')
    .replace(/[ -]/g, '')
    .replace(/[ -]/g, '')
    .replace(/[ -]/g, '')
    .replace(/[ -]/g, '')
    .replace(/[ -]/g, '')
    .replace(/[ -]/g, '')
    .replace(/[ -]/g, '')
    .replace(/[ -]/g, '')
    .replace(/[ -]/g, '')
    .replace(/[ -]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeCategoryKey(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[ -]/g, '')
    .replace(/[ -]/g, '')
    .replace(/[ -]/g, '')
    .replace(/[ -]/g, '')
    .replace(/[ -]/g, '')
    .replace(/[ -]/g, '')
    .replace(/[ -]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeCategoryKey(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getCardCategoryLabel(card) {
  return normalizeCategoryKey(getCategoryName(card.dataset.nombre || ''));
}

function categoryMatchesLabel(card, label) {
  const selected = normalizeCategoryKey(label);
  const cardCategory = getCardCategoryLabel(card);
  if (!selected || !cardCategory) return false;
  return cardCategory === selected || selected.includes(cardCategory) || cardCategory.includes(selected);
}

function addCategoryBadgesToCards() {
  const cards = document.querySelectorAll('.product-card');
  cards.forEach((card) => {
    if (card.querySelector('.category-badge')) return;

    const nombre = card.dataset.nombre || '';
    const iconClass = getCategoryIconClass(nombre);
    const categoryName = getCategoryName(nombre);

    const badge = document.createElement('div');
    badge.className = 'category-badge';
    badge.innerHTML = `<i class="fas ${iconClass}"></i> <span>${categoryName}</span>`;

    const imageContainer = card.querySelector('.product-image-container');
    if (imageContainer) {
      imageContainer.appendChild(badge);
    }
  });
}

function addProductImageOverlayCategory() {
  const cards = document.querySelectorAll('.product-card');
  cards.forEach((card) => {
    const imageContainer = card.querySelector('.product-image-container');
    if (!imageContainer || imageContainer.querySelector('.product-category-overlay')) return;

    const nombre = card.dataset.nombre || '';
    const iconClass = getCategoryIconClass(nombre);
    const categoryName = getCategoryName(nombre);

    const overlay = document.createElement('div');
    overlay.className = 'product-category-overlay';
    overlay.innerHTML = `<i class="fas ${iconClass}"></i> ${categoryName}`;
    imageContainer.appendChild(overlay);
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

// ===== GOOGLE SIGN-IN =====
function iniciarGoogleSignIn() {
  const container = document.getElementById('google-signin-container');
  if (!container) return;
  container.innerHTML = '<div style="padding:0.6rem;color:#333">Próximamente podrás crear tu cuenta o iniciar sesión con Google.</div>';
}

function cerrarSesion() {
  userLoggedIn = false;
  userEmail = null;
  userDiscount = 0;
  localStorage.removeItem('preaftUser');
  if (typeof google !== 'undefined') {
    google.accounts.id.disableAutoSelect();
  }
  updateCartUI();
}

// ===== REINICIAR APP =====
function reiniciarApp() {
  if (confirm('¿Reiniciar la aplicación? Se borrará el carrito.')) {
    cart.length = 0;
    currentProduct = null;
    selectedDeliveryLocation = null;
    cerrarSesion();
    
    // Limpiar localStorage de sesión
    sessionStorage.removeItem('preaftOrderModalSeen');
    
    // Cerrar modales
    closeOrderModal();
    if (modal) modal.style.display = 'none';
    
    // Reiniciar UI
    updateCartUI();
    filtrarProductos({ categoria: 0 }); // Mostrar todos
    
    // Reiniciar mapa
    initDeliveryMap();
  }
}

function actualizarApp() {
  updateCartUI();
  filtrarProductos({ categoria: 0 });
  updateCurrentAddressLabel();
  if (!deliveryMap) initDeliveryMap();
}

// ===== ATENCIÓN AL CLIENTE =====
function abrirWhatsAppSoporte() {
  const mensaje = "¡Hola! Necesito ayuda con mi pedido. 😊";
  const url = `https://wa.me/${numeroWhatsAppSoporte}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
}

function requestCurrentLocation() {
  const status = document.getElementById('deliveryAddressStatus');

  if (!navigator.geolocation) {
    const fallback = { lat: -12.0464, lon: -77.0428, display_name: 'Lima, Perú (ubicación de referencia)' };
    setDeliveryLocation(fallback);
    if (status) {
      status.textContent = 'Tu navegador no comparte ubicación. Se usó Lima como referencia para continuar.';
    }
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const info = await nominatimReverse(lat, lon);
      setDeliveryLocation({ lat, lon, display_name: info?.display_name || `${lat.toFixed(6)}, ${lon.toFixed(6)}` });
      if (status) {
        status.textContent = 'Ubicación actual lista. Puedes confirmar la dirección o ajustar la búsqueda.';
      }
    },
    async () => {
      const fallback = { lat: -12.0464, lon: -77.0428, display_name: 'Lima, Perú (ubicación de referencia)' };
      setDeliveryLocation(fallback);
      if (status) {
        status.textContent = 'No fue posible obtener tu ubicación exacta. Se usó Lima como referencia y puedes escribir tu dirección si lo necesitas.';
      }
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
  );
}

document.addEventListener('DOMContentLoaded', () => {
  addCardAccessibility();
  initCategoryIcons();
  decorateProductCards();
  initSearch();
  initOverlayListeners();
  updateCartUI();
  normalizeUploadPaths();
  initDeliveryMap();

  const solicitarPedidoBtn = document.getElementById('btnSolicitarPedido');
  solicitarPedidoBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    enviarPedidoWhatsApp();
  });
  
  // Restaurar sesión anterior si existe
  const savedUser = localStorage.getItem('preaftUser');
  if (savedUser) {
    try {
      const userData = JSON.parse(savedUser);
      userLoggedIn = true;
      userEmail = userData.email;
      userDiscount = userData.discount || 10;
      console.log('✅ Sesión restaurada:', userEmail);
    } catch (e) {
      localStorage.removeItem('preaftUser');
    }
  }
  
  iniciarGoogleSignIn(); // Mostrar mensaje de cuenta próximamente

  // Address input suggestions
  const addrInput = document.getElementById('deliveryAddressInput');
  if (addrInput) {
    let t;
    addrInput.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(async () => {
        const q = addrInput.value.trim();
        if (!q) return renderAddressSuggestions([]);
        const items = await nominatimSearch(q);
        renderAddressSuggestions(items);
      }, 300);
    });
  }

  // Share current geolocation
  const shareBtn = document.querySelector('.share-location-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => requestCurrentLocation());
  }
  if (!sessionStorage.getItem('preaftOrderModalSeen')) {
    setTimeout(() => openOrderModal(), 700);
    sessionStorage.setItem('preaftOrderModalSeen', '1');
  }
  // Initialize local auth UI and comments
  updateAuthUI();
  loadComments();
  const hash = window.location.hash.replace('#', '');
  if (hash && document.getElementById(hash)) {
    showSection(hash);
  } else {
    showSection('homeSection');
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
  updateCurrentAddressLabel();
  orderTypeModal?.classList.add('visible');
  if (deliveryMap) {
    setTimeout(() => deliveryMap.invalidateSize(), 150);
  }
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

function showSection(sectionId) {
  const sections = document.querySelectorAll('.page-section');
  sections.forEach((section) => section.classList.remove('active'));
  const target = document.getElementById(sectionId);
  if (!target) return;
  const email = getCurrentLocalUserEmail();
  if ((sectionId === 'dashboardSection' || sectionId === 'privateSection') && !email) {
    alert('Debes iniciar sesión para ver esta área.');
    return showSection('loginSection');
  }
  target.classList.add('active');
  document.querySelectorAll('.page-link').forEach((btn) => {
    const section = btn.dataset.section;
    btn.classList.toggle('active', section === sectionId);
  });
  if (sectionId === 'dashboardSection' || sectionId === 'privateSection') {
    document.querySelector('.hidden-page-link')?.classList.remove('hidden');
  }
  target.scrollIntoView({ behavior: 'smooth' });
  window.history.replaceState(null, '', `#${sectionId}`);
}

function scrollToProductCatalog() {
  const catalog = document.getElementById('productGrid');
  if (catalog) catalog.scrollIntoView({ behavior: 'smooth' });
}

function enterPrivateArea() {
  const email = getCurrentLocalUserEmail();
  if (!email) {
    alert('Necesitas estar en tu cuenta para entrar al área privada.');
    return showSection('loginSection');
  }
  const hiddenLink = document.querySelector('.hidden-page-link');
  if (hiddenLink) {
    hiddenLink.style.display = 'inline-flex';
  }
  showSection('privateSection');
}

function toggleCart(forceState) {
  const shouldOpen = typeof forceState === 'boolean' ? forceState : !cartSidebar?.classList.contains('open');
  cartSidebar?.classList.toggle('open', shouldOpen);
  cartOverlay?.classList.toggle('active', shouldOpen);
  document.body.classList.toggle('cart-open', shouldOpen);
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
  
  // Calcular total con descuento si está logueado
  let totalFinal = total;
  let descuentoAplicado = 0;
  
  if (userLoggedIn && userDiscount > 0) {
    descuentoAplicado = total * (userDiscount / 100);
    totalFinal = total - descuentoAplicado;
  }
  
  // Mostrar total y descuento
  let footerContent = `<strong>Subtotal:</strong> S/ ${total.toFixed(2)}<br>`;
  if (userLoggedIn && userDiscount > 0) {
    footerContent += `<strong style="color:green">Descuento (${userDiscount}%):</strong> -S/ ${descuentoAplicado.toFixed(2)}<br>`;
  }
  footerContent += `<strong style="font-size:1.1em">Total:</strong> <span style="color:var(--color-principal)">S/ ${totalFinal.toFixed(2)}</span>`;
  
  // Si está logueado, mostrar insignia
  if (userLoggedIn) {
    footerContent += `<br><small style="color:green">✓ Descuento por usuario registrado</small>`;
  }
  
  const totalElement = document.getElementById('cartTotal');
  if (totalElement) {
    totalElement.innerHTML = footerContent;
  }
}

// --- Local auth & support/comments (simple client-side implementation) ---
function getLocalUsers() {
  try { return JSON.parse(localStorage.getItem('preaftLocalUsers') || '{}'); } catch(e) { return {}; }
}
function saveLocalUsers(users) { localStorage.setItem('preaftLocalUsers', JSON.stringify(users)); }
function getCurrentLocalUserEmail() { return localStorage.getItem('preaftLocalCurrent') || null; }
function setCurrentLocalUserEmail(email) { if (email) localStorage.setItem('preaftLocalCurrent', email); else localStorage.removeItem('preaftLocalCurrent'); }

function updateAuthUI() {
  const email = getCurrentLocalUserEmail();
  const authForms = document.getElementById('authForms');
  const authStatus = document.getElementById('authStatus');
  const dashboardEmail = document.getElementById('dashboardUserEmail');
  const dashboardPoints = document.getElementById('dashboardUserPoints');
  const hiddenLink = document.querySelector('.hidden-page-link');

  if (email) {
    const users = getLocalUsers();
    const u = users[email];
    document.getElementById('authUserLabel').textContent = u ? `Hola, ${u.name}` : email;
    document.getElementById('userPoints').textContent = u?.points || 0;
    if (dashboardEmail) dashboardEmail.textContent = u?.email || email;
    if (dashboardPoints) dashboardPoints.textContent = u?.points || 0;
    if (authForms) authForms.style.display = 'none';
    if (authStatus) authStatus.style.display = 'block';
    if (hiddenLink) hiddenLink.style.display = 'inline-flex';
  } else {
    if (authForms) authForms.style.display = 'flex';
    if (authStatus) authStatus.style.display = 'none';
    if (dashboardEmail) dashboardEmail.textContent = '-';
    if (dashboardPoints) dashboardPoints.textContent = '0';
    if (hiddenLink) hiddenLink.style.display = 'none';
  }
}

function localRegister(nameField = 'regName', emailField = 'regEmail', passField = 'regPass') {
  const name = document.getElementById(nameField)?.value?.trim();
  const email = document.getElementById(emailField)?.value?.trim()?.toLowerCase();
  const pass = document.getElementById(passField)?.value;
  if (!name || !email || !pass) return alert('Completa nombre, correo y contraseña.');
  const users = getLocalUsers();
  if (users[email]) return alert('Ya existe una cuenta con ese correo.');
  users[email] = { name, email, pass, points: 0 };
  saveLocalUsers(users);
  setCurrentLocalUserEmail(email);
  userLoggedIn = true;
  userEmail = email;
  userDiscount = 10;
  updateAuthUI();
  alert('Registro exitoso. Bienvenido ' + name + '.');
  showSection('dashboardSection');
}

function localLogin(emailField = 'loginEmail', passField = 'loginPass') {
  const email = document.getElementById(emailField)?.value?.trim()?.toLowerCase();
  const pass = document.getElementById(passField)?.value;
  if (!email || !pass) return alert('Completa correo y contraseña.');
  const users = getLocalUsers();
  const u = users[email];
  if (!u || u.pass !== pass) return alert('Credenciales incorrectas.');
  setCurrentLocalUserEmail(email);
  userLoggedIn = true;
  userEmail = email;
  userDiscount = 10;
  updateAuthUI();
  alert('Sesión iniciada. Hola ' + (u.name || email));
  showSection('dashboardSection');
}

function localLogout() {
  setCurrentLocalUserEmail(null);
  userLoggedIn = false;
  userEmail = null;
  userDiscount = 0;
  updateAuthUI();
  alert('Has cerrado sesión.');
  showSection('homeSection');
}

function submitSupportForm(event) {
  event.preventDefault();
  const name = document.getElementById('supportName')?.value?.trim();
  const phone = document.getElementById('supportPhone')?.value?.trim();
  const email = document.getElementById('supportEmail')?.value?.trim();
  const order = document.getElementById('supportOrder')?.value?.trim();
  const message = document.getElementById('supportMessage')?.value?.trim();
  if (!name || !message) return alert('Por favor completa nombre y mensaje.');
  // For now, store the request locally and notify user. In production send to server or email.
  const requests = JSON.parse(localStorage.getItem('preaftSupportRequests') || '[]');
  requests.push({ name, phone, email, order, message, date: new Date().toISOString() });
  localStorage.setItem('preaftSupportRequests', JSON.stringify(requests));
  alert('Solicitud enviada. Nuestro equipo te contactará pronto.');
  document.getElementById('supportFormElement')?.reset();
}

// Comments and points
function submitComment() {
  const email = getCurrentLocalUserEmail();
  if (!email) return alert('Debes iniciar sesión para enviar comentarios y acumular puntos.');
  const text = document.getElementById('commentText')?.value?.trim();
  if (!text) return alert('Escribe tu comentario.');
  const comments = JSON.parse(localStorage.getItem('preaftComments') || '[]');
  comments.unshift({ email, text, date: new Date().toISOString() });
  localStorage.setItem('preaftComments', JSON.stringify(comments));
  // award points for comment
  const users = getLocalUsers();
  users[email].points = (users[email].points || 0) + 10;
  saveLocalUsers(users);
  updateAuthUI();
  loadComments();
  document.getElementById('commentText').value = '';
  alert('Gracias por tu comentario. Has ganado 10 puntos.');
}

function loadComments() {
  const comments = JSON.parse(localStorage.getItem('preaftComments') || '[]');
  const el = document.getElementById('commentsList');
  if (!el) return;
  el.innerHTML = comments.map(c => `<div class="comment"><strong>${c.email}</strong><div>${c.text}</div><small>${new Date(c.date).toLocaleString()}</small></div>`).join('');
}

function openSatisfactionPanel() {
  const panel = document.getElementById('satisfactionPanel');
  if (!panel) return;
  panel.classList.add('active');
  panel.scrollIntoView({ behavior: 'smooth' });
}

function closeSatisfactionPanel() {
  const panel = document.getElementById('satisfactionPanel');
  if (!panel) return;
  panel.classList.remove('active');
}

function awardPointsForPurchase(total) {
  const email = getCurrentLocalUserEmail();
  if (!email) return;
  const users = getLocalUsers();
  const earned = Math.max(1, Math.floor(total / 10));
  users[email].points = (users[email].points || 0) + earned;
  saveLocalUsers(users);
  updateAuthUI();
  alert(`Gracias por tu compra. Has ganado ${earned} puntos.`);
}


function enviarPedidoWhatsApp() {
  if (cart.length === 0) return;
  toggleCart(false);

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

  let totalFinal = total;
  let descuentoAplicado = 0;
  if (userLoggedIn && userDiscount > 0) {
    descuentoAplicado = total * (userDiscount / 100);
    totalFinal = total - descuentoAplicado;
    lines.push(`*Subtotal: S/ ${total.toFixed(2)}*`);
    lines.push(`*Descuento (${userDiscount}%): -S/ ${descuentoAplicado.toFixed(2)}*`);
  }

  lines.push(`*Total a pagar: S/ ${totalFinal.toFixed(2)}*`);
  if (userLoggedIn) {
    lines.push('');
    lines.push(`Usuario registrado: ${userEmail}`);
  }

  if (selectedDeliveryLocation) {
    lines.push('');
    lines.push('*Dirección de entrega:*');
    lines.push(`${selectedDeliveryLocation.display_name}`);
    lines.push(`Ubicación: https://www.openstreetmap.org/?mlat=${selectedDeliveryLocation.lat}&mlon=${selectedDeliveryLocation.lon}#map=18/${selectedDeliveryLocation.lat}/${selectedDeliveryLocation.lon}`);
  }

  const base = numeroWhatsApp ? `https://api.whatsapp.com/send?phone=${numeroWhatsApp}&text=` : `https://wa.me/?text=`;
  const url = `${base}${encodeURIComponent(lines.join('\n'))}`;
  const popup = window.open(url, '_blank', 'noopener,noreferrer');

  if (!popup) {
    window.location.href = url;
  }

  setTimeout(() => {
    try {
      awardPointsForPurchase(totalFinal);
    } catch (e) {
      console.warn('No se pudieron asignar puntos:', e);
    }
  }, 150);
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
  let messageEl = productGrid.querySelector('.no-products-message.error-message');
  if (!messageEl) {
    messageEl = document.createElement('div');
    messageEl.className = 'no-products-message error-message';
    productGrid.appendChild(messageEl);
  }
  messageEl.textContent = mensaje;
}

function filtrarProductos(params, btn) {
  if (btn && btn.classList.contains('category-item')) {
    setActiveCategory(btn);
  }

  const selectedCategoryLabel = btn ? btn.textContent.trim() : '';

  const cards = Array.from(productGrid.querySelectorAll('.product-card'));
  const searchTerm = (params.search || '').trim().toLowerCase();
  const categoria = params.categoria !== undefined ? params.categoria : null;

  let visibleCount = 0;

  cards.forEach((card) => {
    const hasCategoria = card.dataset.categoria !== undefined && card.dataset.categoria !== '';
    const cardCategoria = parseInt(card.dataset.categoria || '0', 10);
    const title = (card.dataset.nombre || '').toLowerCase();
    const description = (card.dataset.descripcion || '').toLowerCase();

    const matchCategoria = categoria === null || categoria === 0
      || (hasCategoria && cardCategoria === categoria)
      || (!hasCategoria && categoryMatchesLabel(card, selectedCategoryLabel));

    const matchSearch = searchTerm === '' || title.includes(searchTerm) || description.includes(searchTerm);

    const visible = matchCategoria && matchSearch;
    card.style.display = visible ? '' : 'none';
    if (visible) visibleCount += 1;
  });

  addCategoryBadgesToCards();
  addProductImageOverlayCategory();
  decorateProductCards();

  if (visibleCount === 0) {
    mostrarMensajeError('No se encontraron productos. Intenta con otros filtros.');
  } else {
    const errorMsg = productGrid.querySelector('.no-products-message.error-message');
    if (errorMsg) errorMsg.remove();
  }
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
  addCategoryBadgesToCards();
  addProductImageOverlayCategory();
  decorateProductCards();
  if (visibleCount === 0) {
    mostrarMensajeError('No se encontraron productos para tu búsqueda.');
  }
}
